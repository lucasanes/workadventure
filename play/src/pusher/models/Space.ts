import {
    AddSpaceFilterMessage,
    PartialSpaceUser,
    PrivateEvent,
    PublicEvent,
    PusherToBackSpaceMessage,
    RemoveSpaceFilterMessage,
    SpaceFilterMessage,
    SpaceUser,
    SubMessage,
    UpdateSpaceFilterMessage,
} from "@workadventure/messages";
import Debug from "debug";
import * as Sentry from "@sentry/node";
import { Socket } from "../services/SocketManager";
import { CustomJsonReplacerInterface } from "./CustomJsonReplacerInterface";
import { BackSpaceConnection, SocketData } from "./Websocket/SocketData";

type SpaceUserExtended = { lowercaseName: string } & SpaceUser;

const debug = Debug("space");

export class Space implements CustomJsonReplacerInterface {
    private readonly users: Map<number, SpaceUserExtended>;
    private readonly metadata: Map<string, unknown>;

    private clientWatchers: Map<number, Socket>;

    constructor(
        public readonly name: string,
        private spaceStreamToPusher: BackSpaceConnection,
        public backId: number,
        watcher: Socket
    ) {
        this.users = new Map<number, SpaceUserExtended>();
        this.metadata = new Map<string, unknown>();
        this.clientWatchers = new Map<number, Socket>();
        this.addClientWatcher(watcher);
        debug(`created : ${name}`);
    }

    public addClientWatcher(watcher: Socket) {
        const socketData = watcher.getUserData();
        if (!socketData.userId) {
            throw new Error("User id not found");
        }
        this.clientWatchers.set(socketData.userId, watcher);
        this.users.forEach((user) => {
            if (this.isWatcherTargeted(watcher, user)) {
                const filterOfThisSpace = socketData.spacesFilters.get(this.name) ?? [];
                const filtersTargeted = filterOfThisSpace.filter((spaceFilter) =>
                    this.filterOneUser(spaceFilter, user)
                );

                filtersTargeted.forEach((spaceFilter) => {
                    this.notifyMeAddUser(watcher, user, spaceFilter.filterName);
                });
            }
        });
        debug(`${this.name} : watcher added ${socketData.name}`);
    }

    public removeClientWatcher(watcher: Socket) {
        const socketData = watcher.getUserData();
        if (!socketData.userId) {
            throw new Error("User id not found");
        }
        this.clientWatchers.delete(socketData.userId);
        debug(`${this.name} : watcher removed ${socketData.name}`);
    }

    public addUser(spaceUser: SpaceUser) {
        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                    filterName: undefined,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`${this.name} : user add sent ${spaceUser.id}`);
        this.localAddUser(spaceUser);
    }

    public localAddUser(spaceUser: SpaceUser) {
        const user = { ...spaceUser, lowercaseName: spaceUser.name.toLowerCase() };
        this.users.set(spaceUser.id, user);
        debug(`${this.name} : user added ${spaceUser.id}`);

        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                    filterName: undefined,
                },
            },
        };
        this.notifyAll(subMessage, user);
    }

    public updateUser(spaceUser: PartialSpaceUser, world: string) {
        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.name,
                    user: spaceUser,
                    filterName: undefined,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        this.localUpdateUser(spaceUser, world);
    }
    public localUpdateUser(spaceUser: PartialSpaceUser, world: string) {
        const user = this.users.get(spaceUser.id);
        let oldUser: SpaceUserExtended | undefined;
        if (!user) {
            console.error("User not found in this space", spaceUser);
            return;
        }

        //const updatedUser = merge(user,spaceUser) as SpaceUserExtended;

        if (user) {
            oldUser = structuredClone(user);
            if (spaceUser.tags.length > 0) {
                user.tags = spaceUser.tags;
            }
            if (spaceUser.name) {
                user.name = spaceUser.name;
                user.lowercaseName = spaceUser.name.toLowerCase();
            }
            if (spaceUser.playUri) {
                user.playUri = spaceUser.playUri;
            }
            if (spaceUser.color) {
                user.color = spaceUser.color;
            }
            if (spaceUser.characterTextures.length > 0) {
                user.characterTextures = spaceUser.characterTextures;
            }
            if (spaceUser.isLogged !== undefined) {
                user.isLogged = spaceUser.isLogged;
            }
            if (spaceUser.availabilityStatus !== undefined) {
                user.availabilityStatus = spaceUser.availabilityStatus;
            }
            if (spaceUser.roomName) {
                user.roomName = spaceUser.roomName;
            }
            if (spaceUser.visitCardUrl) {
                user.visitCardUrl = spaceUser.visitCardUrl;
            }
            if (spaceUser.screenSharingState !== undefined) {
                user.screenSharingState = spaceUser.screenSharingState;
            }
            if (spaceUser.microphoneState !== undefined) {
                user.microphoneState = spaceUser.microphoneState;
            }
            if (spaceUser.cameraState !== undefined) {
                user.cameraState = spaceUser.cameraState;
            }
            if (spaceUser.megaphoneState !== undefined) {
                user.megaphoneState = spaceUser.megaphoneState;
            }
            if (spaceUser.jitsiParticipantId) {
                user.jitsiParticipantId = spaceUser.jitsiParticipantId;
            }
            if (spaceUser.uuid) {
                user.uuid = spaceUser.uuid;
            }

            if (spaceUser.chatID) {
                user.chatID = spaceUser.chatID;
            }
        }

        if (spaceUser.name) user.lowercaseName = spaceUser.name.toLowerCase();

        debug(`${this.name} : user updated ${spaceUser.id}`);

        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: `${this.name}`,
                    user: spaceUser,
                    filterName: undefined,
                },
            },
        };
        this.notifyAll(subMessage, user, oldUser);
    }

    public removeUser(userId: number) {
        const pusherToBackSpaceMessage: PusherToBackSpaceMessage = {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this.name,
                    userId,
                    filterName: undefined,
                },
            },
        };
        this.spaceStreamToPusher.write(pusherToBackSpaceMessage);
        debug(`${this.name} : user remove sent ${userId}`);
        this.localRemoveUser(userId);
    }
    public localRemoveUser(userId: number) {
        const user = this.users.get(userId);
        if (user) {
            this.users.delete(userId);
            debug(`${this.name} : user removed ${userId}`);

            const subMessage: SubMessage = {
                message: {
                    $case: "removeSpaceUserMessage",
                    removeSpaceUserMessage: {
                        spaceName: this.name,
                        userId,
                        filterName: undefined,
                    },
                },
            };
            this.notifyAll(subMessage, user);
        } else {
            console.error(`Space => ${this.name} : user not found ${userId}`);
            Sentry.captureException(`Space => ${this.name} : user not found ${userId}`);
        }
    }

    public localUpdateMetadata(metadata: { [key: string]: unknown }) {
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceMetadataMessage",
                updateSpaceMetadataMessage: {
                    spaceName: this.name,
                    metadata: JSON.stringify(metadata),
                    filterName: undefined,
                },
            },
        };
        this.notifyAllMetadata(subMessage);
    }

    private removeSpaceNamePrefix(spaceName: string, prefix: string): string {
        return spaceName.replace(`${prefix}.`, "");
    }

    private notifyAllMetadata(subMessage: SubMessage) {
        this.clientWatchers.forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (subMessage.message?.$case === "updateSpaceMetadataMessage") {
                debug(`${this.name} : metadata update sent to ${socketData.name}`);
                subMessage.message.updateSpaceMetadataMessage.spaceName = this.removeSpaceNamePrefix(
                    subMessage.message.updateSpaceMetadataMessage.spaceName,
                    socketData.world
                );

                socketData.emitInBatch(subMessage);
            }
        });
    }

    private notifyAll(subMessage: SubMessage, youngUser: SpaceUserExtended, oldUser: SpaceUserExtended | null = null) {
        this.clientWatchers.forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (!this.isWatcherTargeted(watcher, youngUser) && !(oldUser && this.isWatcherTargeted(watcher, oldUser)))
                return;

            debug(`${this.name} : ${socketData.name} targeted`);

            const filterOfThisSpace = socketData.spacesFilters.get(this.name) ?? [];

            const filtersTargeted = filterOfThisSpace.filter(
                (spaceFilter) =>
                    this.filterOneUser(spaceFilter, youngUser) || (oldUser && this.filterOneUser(spaceFilter, oldUser))
            );

            filtersTargeted.forEach((spaceFilter) => {
                switch (subMessage.message?.$case) {
                    case "addSpaceUserMessage":
                        subMessage.message.addSpaceUserMessage.filterName = spaceFilter.filterName;
                        debug(`${this.name} : user ${youngUser.lowercaseName} add sent to ${socketData.name}`);
                        subMessage.message.addSpaceUserMessage.spaceName = this.removeSpaceNamePrefix(
                            subMessage.message.addSpaceUserMessage.spaceName,
                            socketData.world
                        );
                        socketData.emitInBatch(subMessage);
                        break;
                    case "removeSpaceUserMessage":
                        subMessage.message.removeSpaceUserMessage.spaceName = this.removeSpaceNamePrefix(
                            subMessage.message.removeSpaceUserMessage.spaceName,
                            socketData.world
                        );
                        subMessage.message.removeSpaceUserMessage.filterName = spaceFilter.filterName;
                        socketData.emitInBatch(subMessage);
                        debug(`${this.name} : user ${youngUser.lowercaseName} remove sent to ${socketData.name}`);
                        break;
                    case "updateSpaceUserMessage": {
                        subMessage.message.updateSpaceUserMessage.filterName = spaceFilter.filterName;
                        subMessage.message.updateSpaceUserMessage.spaceName = this.removeSpaceNamePrefix(
                            subMessage.message.updateSpaceUserMessage.spaceName,
                            socketData.world
                        );

                        const shouldRemoveUser: boolean = oldUser
                            ? this.filterOneUser(spaceFilter, oldUser) && !this.filterOneUser(spaceFilter, youngUser)
                            : false;

                        const shouldAddUser: boolean = oldUser
                            ? !this.filterOneUser(spaceFilter, oldUser) && this.filterOneUser(spaceFilter, youngUser)
                            : false;

                        if (!oldUser || (!shouldRemoveUser && !shouldAddUser)) {
                            socketData.emitInBatch(subMessage);
                            debug(`${this.name} : user ${youngUser.lowercaseName} update sent to ${socketData.name}`);
                            return;
                        }

                        if (shouldAddUser) {
                            this.notifyMeAddUser(watcher, youngUser, spaceFilter.filterName);
                            return;
                        }

                        if (shouldRemoveUser) {
                            this.notifyMeRemoveUser(watcher, youngUser, spaceFilter.filterName);
                            return;
                        }
                        break;
                    }
                }
            });
        });
    }

    public notifyMe(watcher: Socket, subMessage: SubMessage) {
        watcher.getUserData().emitInBatch(subMessage);
    }

    private isWatcherTargeted(watcher: Socket, user: SpaceUserExtended) {
        const filtersOfThisSpace = watcher.getUserData().spacesFilters.get(this.name) ?? [];
        return filtersOfThisSpace.filter((spaceFilter) => this.filterOneUser(spaceFilter, user)).length > 0;
    }

    public filter(
        spaceFilter: SpaceFilterMessage,
        users: Map<number, SpaceUserExtended> | null = null
    ): Map<number, SpaceUserExtended> {
        const usersFiltered = new Map<number, SpaceUserExtended>();
        const usersToFilter = users ?? this.users;
        usersToFilter.forEach((user) => {
            if (this.filterOneUser(spaceFilter, user)) {
                usersFiltered.set(user.id, user);
            }
        });
        return usersFiltered;
    }

    private filterOneUser(spaceFilters: SpaceFilterMessage, user: SpaceUserExtended): boolean {
        if (!spaceFilters.filter) {
            // Sentry event is commented because the line below can cause a complete explosion of number of events sent
            // to Sentry
            //Sentry.captureException("Empty filter received" + spaceFilters.spaceName);
            console.error("Empty filter received");
            return false;
        }

        switch (spaceFilters.filter.$case) {
            case "spaceFilterContainName": {
                const spaceFilterContainName = spaceFilters.filter.spaceFilterContainName;
                return user.lowercaseName.includes(spaceFilterContainName.value.toLowerCase());
            }
            case "spaceFilterEverybody": {
                return true;
            }
            case "spaceFilterLiveStreaming": {
                return /*(user.screenSharingState || user.microphoneState || user.cameraState) &&*/ user.megaphoneState;
            }
            default: {
                const _exhaustiveCheck: never = spaceFilters.filter;
            }
        }
        return false;
    }

    public handleAddFilter(watcher: Socket, addSpaceFilterMessage: AddSpaceFilterMessage) {
        const newFilter = addSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            debug(`${this.name} : filter added (${newFilter.filterName}) for ${watcher.getUserData().userId}`);
            const newData = this.filter(newFilter);
            const userData = watcher.getUserData();
            const currentSpaceFilterList = userData.spacesFilters.get(this.name) ?? [];
            userData.spacesFilters.set(this.name, [...(currentSpaceFilterList || []), newFilter]);
            this.delta(watcher, this.users, newData, newFilter.filterName);
        }
    }

    public handleUpdateFilter(watcher: Socket, updateSpaceFilterMessage: UpdateSpaceFilterMessage) {
        const newFilter = updateSpaceFilterMessage.spaceFilterMessage;
        if (newFilter) {
            const oldFilter = watcher
                .getUserData()
                .spacesFilters.get(this.name)
                ?.find((filter) => filter.filterName === newFilter.filterName);
            if (oldFilter) {
                debug(`${this.name} : filter updated (${newFilter.filterName}) for ${watcher.getUserData().userId}`);
                const usersInOldFilter = this.filter(oldFilter);
                const usersInNewFilter = this.filter(newFilter);
                this.delta(watcher, usersInOldFilter, usersInNewFilter, newFilter.filterName);
            }
        }
    }

    public handleRemoveFilter(watcher: Socket, removeSpaceFilterMessage: RemoveSpaceFilterMessage) {
        const oldFilter = removeSpaceFilterMessage.spaceFilterMessage;
        if (!oldFilter) return;
        debug(`${this.name} : filter removed (${oldFilter.filterName}) for ${watcher.getUserData().userId}`);
        const oldUsers = this.filter(oldFilter);
        this.delta(watcher, oldUsers, this.users, undefined);
    }

    private delta(
        watcher: Socket,
        oldData: Map<number, SpaceUserExtended>,
        newData: Map<number, SpaceUserExtended>,
        filterName: string | undefined
    ) {
        let addedUsers = 0;
        // Check delta between responses by old and new filter
        newData.forEach((user) => {
            if (!oldData.has(user.id)) {
                this.notifyMeAddUser(watcher, user, filterName);
                addedUsers++;
            }
        });

        let removedUsers = 0;
        oldData.forEach((user) => {
            if (!newData.has(user.id)) {
                this.notifyMeRemoveUser(watcher, user, filterName);
                removedUsers++;
            }
        });

        debug(
            `${this.name} : filter calculated for ${
                watcher.getUserData().userId
            } (${addedUsers} added, ${removedUsers} removed)`
        );
    }

    private notifyMeAddUser(watcher: Socket, user: SpaceUserExtended, filterName: string | undefined) {
        const subMessage: SubMessage = {
            message: {
                $case: "addSpaceUserMessage",
                addSpaceUserMessage: {
                    spaceName: this.removeSpaceNamePrefix(this.name, watcher.getUserData().world),
                    user,
                    filterName,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    private notifyMeUpdateUser(watcher: Socket, user: SpaceUserExtended, filterName: string | undefined) {
        const subMessage: SubMessage = {
            message: {
                $case: "updateSpaceUserMessage",
                updateSpaceUserMessage: {
                    spaceName: this.removeSpaceNamePrefix(this.name, watcher.getUserData().world),
                    user,
                    filterName,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }
    private notifyMeRemoveUser(watcher: Socket, user: SpaceUserExtended, filterName: string | undefined) {
        const subMessage: SubMessage = {
            message: {
                $case: "removeSpaceUserMessage",
                removeSpaceUserMessage: {
                    spaceName: this.removeSpaceNamePrefix(this.name, watcher.getUserData().world),
                    userId: user.id,
                    filterName,
                },
            },
        };
        this.notifyMe(watcher, subMessage);
    }

    public isEmpty() {
        return this.users.size === 0;
    }

    public customJsonReplacer(key: unknown, value: unknown): string | undefined {
        // TODO : Better way to display date in the /dump
        if (key === "name") {
            return this.name;
        } else if (key === "users") {
            return `Users : ${this.users.size}`;
        }
        return undefined;
    }

    public kickOffUser(senderDara: SocketData, userId: string) {
        if (!senderDara.tags.includes("admin")) return;
        const subMessage: SubMessage = {
            message: {
                $case: "kickOffMessage",
                kickOffMessage: {
                    spaceName: this.name,
                    userId,
                    filterName: undefined,
                },
            },
        };
        this.notifyAllUsers(subMessage);
    }

    public muteMicrophoneUser(senderDara: SocketData, userId: string) {
        let subMessage: SubMessage = {
            message: {
                $case: "muteMicrophoneMessage",
                muteMicrophoneMessage: {
                    spaceName: this.name,
                    userId,
                    filterName: undefined,
                },
            },
        };
        if (!senderDara.tags.includes("admin")) {
            subMessage = {
                message: {
                    $case: "askMuteMicrophoneMessage",
                    askMuteMicrophoneMessage: {
                        spaceName: this.name,
                        userId,
                        filterName: undefined,
                    },
                },
            };
        }
        this.notifyAllUsers(subMessage);
    }

    public muteVideoUser(senderDara: SocketData, userId: string) {
        let subMessage: SubMessage = {
            message: {
                $case: "muteVideoMessage",
                muteVideoMessage: {
                    spaceName: this.name,
                    userId,
                    filterName: undefined,
                },
            },
        };
        if (!senderDara.tags.includes("admin")) {
            subMessage = {
                message: {
                    $case: "askMuteVideoMessage",
                    askMuteVideoMessage: {
                        spaceName: this.name,
                        userId,
                        filterName: undefined,
                    },
                },
            };
        }
        this.notifyAllUsers(subMessage);
    }

    public muteMicrophoneEverybodyUser(senderDara: SocketData, userId: string) {
        if (!senderDara.tags.includes("admin")) return;
        const subMessage: SubMessage = {
            message: {
                $case: "muteMicrophoneEverybodyMessage",
                muteMicrophoneEverybodyMessage: {
                    spaceName: this.name,
                    userId,
                    filterName: undefined,
                },
            },
        };
        this.notifyAllUsers(subMessage);
    }

    public muteVideoEverybodyUser(senderDara: SocketData, userId: string) {
        if (!senderDara.tags.includes("admin")) return;
        const subMessage: SubMessage = {
            message: {
                $case: "muteVideoEverybodyMessage",
                muteVideoEverybodyMessage: {
                    spaceName: this.name,
                    userId,
                    filterName: undefined,
                },
            },
        };
        this.notifyAllUsers(subMessage);
    }

    public sendPublicEvent(message: PublicEvent) {
        this.notifyAllUsers({
            message: {
                $case: "publicEvent",
                publicEvent: message,
            },
        });
    }

    public sendPrivateEvent(message: PrivateEvent) {
        [...this.clientWatchers.values()].forEach((watcher) => {
            const socketData = watcher.getUserData();
            if (socketData.userId === message.receiverUserId) {
                socketData.emitInBatch({
                    message: {
                        $case: "privateEvent",
                        privateEvent: message,
                    },
                });
            }
        });
    }

    // Notify all users in this space
    private notifyAllUsers(subMessage: SubMessage) {
        this.clientWatchers.forEach((watcher) => {
            const socketData = watcher.getUserData();
            debug(`${this.name} : kickOff sent to ${socketData.name}`);
            socketData.emitInBatch(subMessage);
        });
    }
}
