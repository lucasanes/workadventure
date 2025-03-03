import { expect, test } from "@playwright/test";
import { resetWamMaps } from "../utils/map-editor/uploader";
import Map from "../utils/map";
import { login } from "../utils/roles";
import { oidcLogout, oidcMatrixUserLogin } from "../utils/oidc";
import ChatUtils from "./chatUtils";

test.describe("Matrix chat tests @oidc", () => {
  test.beforeEach(
    "Ignore tests on webkit because of issue with camera and microphone",

    async ({ browserName, request, page }) => {
      //WebKit has issue with camera
      if (browserName === "webkit") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
      await resetWamMaps(request);
      await page.goto(Map.url("empty"));
      await ChatUtils.resetMatrixDatabase();
    }
  );
  test("Open matrix Chat", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await expect(page.getByTestId("chat")).toBeAttached();
  });

  test("Create a public chat room", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await expect(page.getByText(publicChatRoomName)).toBeAttached();
  });

  test("Send messages in public chat room", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
  });

  test("Reply to message", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("replyToMessageButton").click();
    await page.getByTestId("messageInput").fill("Sample response");
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(chatMessageContent)).toHaveCount(2);
  });

  test("React to message", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("openEmojiPickerButton").click();
    const reactionKey = "😀";
    await page.getByText(reactionKey).nth(1).click({ force: true });
    await expect(
      page.getByTestId(`${reactionKey}_reactionButton`)
    ).toBeAttached();
  });

  test("Remove reaction to message", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("openEmojiPickerButton").click();
    const reactionKey = "😀";
    await page.getByText(reactionKey).nth(1).click({ force: true });
    await page.getByTestId(`${reactionKey}_reactionButton`).click();
    await expect(
      page.getByTestId(`${reactionKey}_reactionButton`)
    ).not.toBeAttached();
  });

  test("Remove message", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("removeMessageButton").click();
    await expect(page.getByText(chatMessageContent)).not.toBeAttached();
  });

  test("Edit message", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    const chatMessageEdited = "This is a test edited message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("editMessageButton").click();
    await page.getByTestId("editMessageInput").fill(chatMessageEdited);
    await page.getByTestId("saveMessageEditionButton").click();
    await expect(page.getByText(chatMessageEdited)).toBeAttached();
    await expect(page.getByText(chatMessageContent)).not.toBeAttached();
  });

  test("Cancel edit message", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const publicChatRoomName = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(publicChatRoomName);
    await page.getByTestId("createRoomButton").click();
    await page.getByText(publicChatRoomName).click();
    const chatMessageContent = "This is a test message";
    const chatMessageEdited = "This is a test edited message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await page.getByText(chatMessageContent).hover();
    await page.getByTestId("editMessageButton").click();
    await page.getByTestId("editMessageInput").fill(chatMessageEdited);
    await page.getByTestId("cancelMessageEditionButton").click();
    await expect(page.getByText(chatMessageEdited)).not.toBeAttached();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
  });

  test("Create a private chat room", async ({ page }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = ChatUtils.getRandomName();
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByTestId("createRoomButton").click();
    await expect(page.getByText(privateChatRoom)).toBeAttached();
  });

  test("Create a private encrypted chat room (new user)", async ({
    page,
    context,
  }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(page, context);
    await expect(page.getByText(privateChatRoom)).toBeAttached();
  });

  test("Send message in private chat room (new user)", async ({
    page,
    context,
  }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(page, context);
    await page.getByText(privateChatRoom).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);
    await page.getByTestId("sendMessageButton").click();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
  });

  test("Retrieve encrypted message", async ({ page, context }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "us-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(page, context);
    await page.getByText(privateChatRoom).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);

    //We need to wait for the room key to be uploaded
    const roomKeyBackupPromise = page.waitForResponse(
      (response) =>
        response.url().includes("keys?version") && response.status() === 200
    );
    await page.getByTestId("sendMessageButton").click();
    await roomKeyBackupPromise;

    //We need to wait for anonym login to prevent issue with logout/login fast processing
    const anonymLoginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("anonymLogin") && response.status() === 200
    );
    if (project.name === "mobilechromium") {
      await ChatUtils.closeChat(page);
    }
    await oidcLogout(page, isMobile);
    await anonymLoginPromise;
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.restoreEncryption(page);
    await ChatUtils.openChat(page);
    await page.getByText(privateChatRoom).click();
    await expect(page.getByText(chatMessageContent)).toBeAttached();
  });

  test("Retrieve encrypted message after cancelling passphrase request", async ({
    page,
    context,
  }, { project }) => {
    const isMobile = project.name === "mobilechromium";
    await login(page, "test", 3, "en-US", isMobile);
    await oidcMatrixUserLogin(page, isMobile);
    await ChatUtils.openChat(page);
    await ChatUtils.openCreateRoomDialog(page);
    const privateChatRoom = `Encrypted_${ChatUtils.getRandomName()}`;
    await page.getByTestId("createRoomName").fill(privateChatRoom);
    await page.getByTestId("createRoomVisibility").selectOption("private");
    await page.getByTestId("createRoomEncryption").check();
    await page.getByTestId("createRoomButton").click();
    await ChatUtils.initEndToEndEncryption(page, context);
    await page.getByText(privateChatRoom).click();
    const chatMessageContent = "This is a test message";
    await page.getByTestId("messageInput").fill(chatMessageContent);

    //We need to wait for the room key to be uploaded
    const roomKeyBackupPromise = page.waitForResponse(
      (response) =>
        response.url().includes("keys?version") && response.status() === 200
    );
    await page.getByTestId("sendMessageButton").click();
    await roomKeyBackupPromise;

    //We need to wait for anonym login to prevent issue with logout/login fast processing
    const anonymLoginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("anonymLogin") && response.status() === 200
    );
    if (project.name === "mobilechromium") {
      await ChatUtils.closeChat(page);
    }
    await oidcLogout(page, isMobile);
    await anonymLoginPromise;

    await oidcMatrixUserLogin(page, isMobile);
    await page.getByText("Cancel").click();
    await ChatUtils.openChat(page);
    await page.getByText(privateChatRoom).click();
    await expect(page.getByText("Failed to decrypt")).toBeAttached();
    await ChatUtils.restoreEncryptionFromButton(page);
    await expect(page.getByText(chatMessageContent)).toBeAttached();
  });
});
