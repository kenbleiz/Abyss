# Abyss

Aquarium ASCII autonome pour OBS, réactif au chat Twitch.

## Overlay OBS

1. Publie / ouvre l’app, copie le lien **Source OBS** dans le studio.
2. Dans OBS : source *Navigateur*, 1920×1080 (ou 1080×1920 en vertical).
3. Décoche « Couper la source quand elle n’est pas visible » — le bac doit continuer à vivre.
4. Option **Fond transparent** pour le caler sur ta cam.

Le récif se souvient des poissons, des noms et de la faim même si tu relances la source.

## Chat

Entre ta chaîne Twitch (lecture du chat public, sans login).

| Commande | Effet |
|---|---|
| `!nourrir` / `!feed` | flakes |
| `!caresse` / `!monpoisson` | cœurs (ton poisson si adopté) |
| `!nom Nemo` / `!adopte` | baptise / adopte |
| `!danse` | le récif s’agite |
| `!bulle` `!vague` `!poisson` `!requin` `!tresor` | événements |
| `!aide` | liste dans le bac |

**Alertes Twitch** (sans OAuth) : subs, gifts, raids, bits.  
**Follows** via Streamer.bot dans la source navigateur :

```js
abyssEvent('follow', 'nick')
abyssCommand('nick', '!nourrir')
```

## Live autonome

Sans viewers : bulles, crabes, jour/nuit, faim. Trop longtemps sans nourriture, un poisson se replie en œuf puis éclot. Les algues montent si le bac a faim.

## Sons

Clique une fois dans le bac pour débloquer l’audio (bulles, flakes, alertes). Coupable dans le studio.

## Dev

```
npm install
npm run dev
```
