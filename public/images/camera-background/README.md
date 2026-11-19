# Animated camera backgrounds

Seamless loops listed in `CAMERA_BG_VIDEO_PRESETS` ([`public/js/roomBackground.js`](../../js/roomBackground.js)), each with a poster (same name, `.jpg`) used as its thumbnail. They are offered as camera backgrounds only: the room background stays a still image.

All clips come from [Mixkit](https://mixkit.co) under the [Mixkit Stock Video Free License](https://mixkit.co/license/#videoFree) (commercial and personal use, modification and distribution allowed, no attribution required). Only use clips whose page shows this Free License: clips under the Mixkit Restricted License are for personal use only.

| File                      | Source                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `cozy-fireplace.mp4`      | [Wood burning in a fireplace](https://mixkit.co/free-stock-video/x-1242/)                 |
| `christmas-fireplace.mp4` | [A fireplace lit at Christmas time](https://mixkit.co/free-stock-video/x-2707/)           |
| `christmas-tree.mp4`      | [Close view of a Christmas tree](https://mixkit.co/free-stock-video/x-44579/)             |
| `modern-living-room.mp4`  | [Minimalist room with gray sofa](https://mixkit.co/free-stock-video/x-3110/)              |
| `rainy-city-window.mp4`   | [Window on a rainy day](https://mixkit.co/free-stock-video/x-2846/)                       |
| `beach-paradise.mp4`      | [White sand beach background](https://mixkit.co/free-stock-video/x-1564/)                 |
| `tropical-island.mp4`     | [Tropical island landscape view](https://mixkit.co/free-stock-video/x-4692/)              |
| `tropical-sunset.mp4`     | [Bright orange sunset on beach](https://mixkit.co/free-stock-video/x-2168/)               |
| `swiss-alps.mp4`          | [Swiss Alps snow background time-lapse](https://mixkit.co/free-stock-video/x-4283/)       |
| `mountain-clouds.mp4`     | [Clouds covering the mountains](https://mixkit.co/free-stock-video/x-4695/)               |
| `winter-moon.mp4`         | [Moon in the sky a snowy forest](https://mixkit.co/free-stock-video/x-3350/)              |
| `countryside-meadow.mp4`  | [Countryside meadow](https://mixkit.co/free-stock-video/x-4075/)                          |
| `aquarium.mp4`            | [Tropical freshwater fish and moss in a tank](https://mixkit.co/free-stock-video/x-4021/) |
| `space-stars.mp4`         | [Stars in space background](https://mixkit.co/free-stock-video/x-1610/)                   |
| `milky-way.mp4`           | [Milky Way seen at night](https://mixkit.co/free-stock-video/x-4148/)                     |
| `starry-lake.mp4`         | [Night sky with stars at a calm lake](https://mixkit.co/free-stock-video/x-1704/)         |
| `northern-lights.mp4`     | [Aurora borealis timelapse](https://mixkit.co/free-stock-video/x-4033/)                   |

## Encoding

1280×720 (the compositor scales backgrounds to at most 1280 px), H.264 High, `yuv420p`, no audio, `+faststart`, source frame rate capped at 30 fps, CRF 26 with a 2 Mbit/s cap and light `hqdn3d` denoise.

- Static shots loop with a 1.5 s crossfade of their end into their start.
- Shots with camera movement loop forward then reversed (ping-pong), so the seam has no jump.

Posters are the frame at 1 s, 320×180 JPEG.

## Caching

The server sends `Cache-Control: public, max-age=2592000, immutable` for the videos and posters in this folder (see `isCameraBackgroundAsset` in [`app/src/server.js`](../../../app/src/server.js)): after the first download, browsers reuse them for 30 days without contacting the server. Never replace a file in place: give a changed clip or poster a new file name (e.g. `cozy-fireplace-v2.mp4`) and update `CAMERA_BG_VIDEO_PRESETS`.
