<script setup lang="ts">
import { IonContent, IonPage } from "@ionic/vue";
import { onBeforeUnmount, onMounted, ref } from "vue";
import MagazineScene from "@/components/MagazineScene.vue";
import portfolio from "@/data/portfolio.json";

const states = portfolio.navigation;

const currentState = ref(0);

function navigate(direction: number) {
  currentState.value = Math.max(
    0,
    Math.min(states.length - 1, currentState.value + direction),
  );
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowRight") navigate(1);
  if (event.key === "ArrowLeft") navigate(-1);
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <IonPage>
    <IonContent :scroll-y="false" :fullscreen="true">
      <main class="portfolio-shell">
        <MagazineScene :state="currentState" @navigate="navigate" />

        <header class="ui-header">
          <div class="mark" :aria-label="portfolio.site.owner">
            {{ portfolio.site.mark.slice(0, -1) }}<span>{{ portfolio.site.mark.slice(-1) }}</span>
          </div>
          <div class="edition">{{ portfolio.site.headerTitle }}</div>
          <a :href="`mailto:${portfolio.site.email}`"><i /> {{ portfolio.site.status }}</a>
        </header>

        <Transition name="hint">
          <div v-if="currentState === 0" class="ui-hint">
            {{ portfolio.cover.screenHint }}
          </div>
        </Transition>

        <nav class="ui-nav" aria-label="Navegación de la revista">
          <button
            type="button"
            :disabled="currentState === 0"
            aria-label="Página anterior"
            @click="navigate(-1)"
          >
            <svg viewBox="0 0 32 16" aria-hidden="true">
              <path d="M31 8H2M8 1 1 8l7 7" />
            </svg>
          </button>

          <div class="label" aria-live="polite">
            <small>{{ states[currentState].sub }}</small>
            <b>{{ states[currentState].label }}</b>
            <div class="dots" aria-hidden="true">
              <i
                v-for="(_, index) in states"
                :key="index"
                :class="{ on: index === currentState }"
              />
            </div>
          </div>

          <button
            type="button"
            :disabled="currentState === states.length - 1"
            aria-label="Página siguiente"
            @click="navigate(1)"
          >
            <svg viewBox="0 0 32 16" aria-hidden="true">
              <path d="M1 8h29M24 1l7 7-7 7" />
            </svg>
          </button>
        </nav>
      </main>
    </IonContent>
  </IonPage>
</template>
