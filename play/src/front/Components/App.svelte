<script lang="ts">
    import type { Game } from "../Phaser/Game/Game";
    import { errorStore } from "../Stores/ErrorStore";
    import { errorScreenStore } from "../Stores/ErrorScreenStore";
    import { loginSceneVisibleStore } from "../Stores/LoginSceneStore";
    import { enableCameraSceneVisibilityStore } from "../Stores/MediaStore";
    import {
        selectCharacterCustomizeSceneVisibleStore,
        selectCharacterSceneVisibleStore,
    } from "../Stores/SelectCharacterStore";
    import { selectCompanionSceneVisibleStore } from "../Stores/SelectCompanionStore";
    import { gameSceneIsLoadedStore } from "../Stores/GameSceneStore";
    import { mapEditorModeStore } from "../Stores/MapEditorStore";
    import { refreshPromptStore } from "../Stores/RefreshPromptStore";
    import { forceRefreshChatStore } from "../Stores/ChatStore";
    import ChatSidebar from "../Chat/ChatSidebar.svelte";
    import { isActivatedStore, isCalendarVisibleStore } from "../Stores/CalendarStore";
    import EnableCameraScene from "./EnableCamera/EnableCameraScene.svelte";
    import LoginScene from "./Login/LoginScene.svelte";
    import MainLayout from "./MainLayout.svelte";
    import SelectCharacterScene from "./SelectCharacter/SelectCharacterScene.svelte";
    import SelectCompanionScene from "./SelectCompanion/SelectCompanionScene.svelte";
    import ErrorDialog from "./UI/ErrorDialog.svelte";
    import ErrorScreen from "./UI/ErrorScreen.svelte";
    import MapEditor from "./MapEditor/MapEditor.svelte";
    import RefreshPrompt from "./RefreshPrompt.svelte";
    import SelectCharacterCustomizeScene from "./SelectCharacter/SelectCharacterCustomizeScene.svelte";
    import Calendar from "./Calendar/Calendar.svelte";

    export let game: Game;

    let token;
    
    const tokenStoraged = localStorage.getItem("workadventure@authToken")
    
    if (tokenStoraged) {
      token = tokenStoraged
    } else {
      const params = new URLSearchParams(document.location.search.substring(1))
      const tokenParam = params.get("authToken")
      token = tokenParam
    }

    function validateToken(token: string) {
      if (token) {
        fetch("https://devcalendar-api.eumedicoresidente.com.br/api/users/me", {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        .then((response) => {
          if (response.status != 200) {
            localStorage.removeItem("workadventure@authToken")
            window.location.href = "https://strapi.kaualf.com"
          } else {
            localStorage.setItem("workadventure@authToken", token)

            response.json().then((data) => {
              if (!data.email.includes("eumedicoresidente.com.br")) {
                setTimeout(() => validateToken(token), 30000)
              }
            })
          }
        })
        .catch((err) => {
          console.log(err)
          localStorage.removeItem("workadventure@authToken")
          window.location.href = "https://strapi.kaualf.com"
        })
      } else {
        window.location.href = "https://strapi.kaualf.com"
      }
    }

    if (token) {
      validateToken(token)
    }

    /**
     * When changing map from an exit on the current map, the Chat and the MainLayout are not really destroyed
     * due to an internal issue of Svelte, we use a #key directive to force the destruction of the components.
     * https://github.com/sveltejs/svelte/issues/5268
     */
</script>

{#if $errorScreenStore !== undefined}
    <div>
        <ErrorScreen />
    </div>
{:else if $errorStore.length > 0}
    <div>
        <ErrorDialog />
    </div>
{:else if $loginSceneVisibleStore}
    <div class="scrollable">
        <LoginScene {game} />
    </div>
{:else if $selectCharacterSceneVisibleStore}
    <div>
        <SelectCharacterScene {game} />
    </div>
{:else if $selectCharacterCustomizeSceneVisibleStore}
    <div>
        <SelectCharacterCustomizeScene {game} />
    </div>
{:else if $selectCompanionSceneVisibleStore}
    <div>
        <SelectCompanionScene {game} />
    </div>
{:else if $enableCameraSceneVisibilityStore}
    <div class="scrollable">
        <EnableCameraScene {game} />
    </div>
{:else if $gameSceneIsLoadedStore && !$selectCharacterCustomizeSceneVisibleStore}
    {#if $refreshPromptStore}
        <RefreshPrompt />
    {/if}
    {#key $forceRefreshChatStore}
        <ChatSidebar />
        {#if $mapEditorModeStore}
            <MapEditor />
        {/if}
        <MainLayout />
    {/key}
    {#if $isActivatedStore && $isCalendarVisibleStore}
        <Calendar />
    {/if}
{/if}
