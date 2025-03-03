<script lang="ts">
    import { onMount } from "svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { ChatUser } from "../../Connection/ChatConnection";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { chatSearchBarValue, shownRoomListStore } from "../../Stores/ChatStore";
    import UserList from "./UserList.svelte";
    import { IconChevronUp } from "@wa-icons";

    const chat = gameManager.getCurrentGameScene().chatConnection;
    const DISCONNECTED_LABEL = "disconnected";
    const DISCONNECTED_USERS_LIMITATION = 200;

    onMount(() => {
        if ($shownRoomListStore === "") shownRoomListStore.set($LL.chat.userList.isHere());
    });

    $: userConnected = chat.connectedUsers;
    $: filteredUserConnected = Array.from($userConnected.values()).filter(({ username }) =>
        username ? username.toLocaleLowerCase().includes($chatSearchBarValue) : false
    );

    $: usersByRoom = filteredUserConnected.reduce((acc, curr) => {
        let room = curr.roomName ?? DISCONNECTED_LABEL;

        room = room === gameManager?.getCurrentGameScene()?.room?.roomName ? $LL.chat.userList.isHere() : room;
        const userList: Array<ChatUser> = acc.get(room) ?? [];

        userList.push(curr);
        acc.set(room, userList);

        return acc;
    }, new Map<string, ChatUser[]>());

    $: userDisconnected = chat.userDisconnected;
    $: filteredUserDisconnected = Array.from($userDisconnected.values())
        .filter(
            ({ id, username }) =>
                (username ? username.toLocaleLowerCase().includes($chatSearchBarValue) : false) &&
                filteredUserConnected.every((user: ChatUser) => user.id !== id)
        )
        .slice(0, DISCONNECTED_USERS_LIMITATION);

    $: roomsWithUsers = [
        ...Array.from(usersByRoom?.entries() || []).sort(
            ([aKey, _aValue]: [string, ChatUser[]], [bKey, _bValue]: [string, ChatUser[]]) =>
                aKey === $LL.chat.userList.isHere() ? -1 : aKey.localeCompare(bKey)
        ),
        [DISCONNECTED_LABEL, filteredUserDisconnected ?? []],
    ] as Array<[string, ChatUser[]]>;
</script>

<div class="tw-flex tw-flex-col tw-overflow-hidden">
    {#each roomsWithUsers as [roomName, userInRoom] (roomName)}
        {#if userInRoom && userInRoom.length > 0}
            <div
                class="tw-overflow-hidden users tw-flex tw-flex-col tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple"
            >
                <div class="tw-px-4 tw-py-3 tw-flex tw-items-center tw-flex-0">
                    <span
                        class="{roomName !== DISCONNECTED_LABEL
                            ? 'tw-bg-light-blue'
                            : 'tw-bg-gray'} tw-text-dark-purple tw-min-w-[20px] tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
                    >
                        {#if userInRoom?.length && userInRoom.length > 0 && roomName !== DISCONNECTED_LABEL}
                            {userInRoom?.length}
                        {/if}
                    </span>
                    <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
                        {roomName}
                    </p>
                    <button
                        class="tw-text-lighter-purple"
                        on:click={() => shownRoomListStore.set($shownRoomListStore === roomName ? "" : roomName)}
                    >
                        <IconChevronUp
                            class={`tw-transform tw-transition ${
                                $shownRoomListStore === roomName ? "" : "tw-rotate-180"
                            }`}
                        />
                    </button>
                </div>
                {#if $shownRoomListStore === roomName}
                    <div class="tw-flex tw-flex-col tw-flex-1 tw-overflow-auto">
                        <UserList userList={userInRoom} />
                    </div>
                {/if}
            </div>
        {/if}
    {/each}
</div>
