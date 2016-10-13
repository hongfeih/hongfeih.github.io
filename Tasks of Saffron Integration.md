# Saffron Integration

## 1. Media Converter
- ~10/30
- Support ProRes 422 codec
- Audio layout options 
	- 2 streams to 1 aac, 6 streams to aac 5.1
	- 1/2 wav files to 1 aac, 1/6 wav files to 5.1
- https://wiki.saffrondigital.com/display/NI01/Supported+Ingest+Formats
	
## 2. AS3
- ~10/30
- SS + PR
	- Saffron subtitles
		```
		// https://wiki.saffrondigital.com/display/NI01/Required+Profiles
		<!-- Created with NeuLion Streaming Platform 
		BEGIN_NEULION_SUBS
		{
            "subtitles": [{
                "name": "French",
                "language": "fra",
                "ttml_location": "subtitles_fra.ttml"
                "webvtt_location": "subtitles_fra.vtt"
            }, {
                "name": "English",
                "language": "eng",
                "ttml_location": "subtitles_eng.ttml"
                "webvtt_location": "subtitles_eng.vtt"
            }]
		}
		END_NEULION_SUBS
		-->
		```
	- https://tribeca-s.akamaihd.net/ondemand/d9b8a0d2-c8f4-4c1b-be04-4539b725a681/c2192f2c-d883-4936-aede-406dc57da70a_ns.ism/Manifest
- HLS + PR
	- Master m3u8 add:
		```
		// http://tribeca-a.akamaihd.net/d9b8a0d2-c8f4-4c1b-be04-4539b725a681/3ee063a8-32bc-4894-a17d-769036ae4c32.m3u8
		#EXT-X-SDPLAYREADY:WRMHEADER=8gIAAAEAAQDoAjwAVwBSAE0ASABFAEEARABFAFIAIAB2AGUAcgBzAGkAbwBuAD0AIgA0AC4AMAAuADAALgAwACIAIAB4AG0AbABuAHMAPQAiAGgAdAB0AHAAOgAvAC8AcwBjAGgAZQBtAGEAcwAuAG0AaQBjAHIAbwBzAG8AZgB0AC4AYwBvAG0ALwBEAFIATQAvADIAMAAwADcALwAwADMALwBQAGwAYQB5AFIAZQBhAGQAeQBIAGUAYQBkAGUAcgAiAD4APABEAEEAVABBAD4APABQAFIATwBUAEUAQwBUAEkATgBGAE8APgA8AEsARQBZAEwARQBOAD4AMQA2ADwALwBLAEUAWQBMAEUATgA+ADwAQQBMAEcASQBEAD4AQQBFAFMAQwBUAFIAPAAvAEEATABHAEkARAA+ADwALwBQAFIATwBUAEUAQwBUAEkATgBGAE8APgA8AEsASQBEAD4ATABCAGIATwBqAGQAawBTAC8AawBHAHUAYwBzAHQAcgA3AGwAUQBJAGMAUQA9AD0APAAvAEsASQBEAD4APABEAFMAXwBJAEQAPgBjAC8ANwB3AGkAcwA2AHUAbQAwAFMAVwBlAEoAZgBGAGYAcQBlAGUAdwBRAD0APQA8AC8ARABTAF8ASQBEAD4APABMAEEAXwBVAFIATAA+AGgAdAB0AHAAcwA6AC8ALwBwAHIAbwBkAC0AbABpAGMAZQBuAHMAaQBuAGcALgBzAGQALQBuAGcAcAAuAG4AZQB0AC8AbABpAGMAZQBuAHMAaQBuAGcALwByAGkAZwBoAHQAcwBtAGEAbgBhAGcAZQByAC4AYQBzAG0AeAA8AC8ATABBAF8AVQBSAEwAPgA8AEMASABFAEMASwBTAFUATQA+AGwAWABDAE8ARgB3AFcATgBLADkATQA9ADwALwBDAEgARQBDAEsAUwBVAE0APgA8AC8ARABBAFQAQQA+ADwALwBXAFIATQBIAEUAQQBEAEUAUgA+AA==
		#EXT_X-SDCRYPTO: SAMPLE-AES
		#EXT-X-SDCRYPTO: SAMPLE-AES
		#EXT-X-VERSION:4
		```
	- SBR m3u8 add:
		```
		// http://tribeca-a.akamaihd.net/d9b8a0d2-c8f4-4c1b-be04-4539b725a681/ec0c44dc6765460fbf390295fa307967.m3u8
		#EXT_X-SDCRYPTO: SAMPLE-AES
		```
- Packager
	- SS
	- Support adding additional audios and subtitles to existing program
- Integrate with key server
	- Done, need more tests

## 3. Player SDK
- ~11/30
- Provide to Saffron the current player SDK of iOS/Android for evaluation
- Android
	- **Integrate with DLM**
	- DASH + Widevine 
		- including download playback
	- DASH + PlayReady (FireTV, need check)
		- **Integrate with PlayReady porting kit**
- iOS
	- Streaming
		- HLS + FairPlay 
	- Download
		- **Integrate with DLM**
		- HLS + PlayReady (iOS 9, Saffron provide porting kit)
			- **Integrate with PlayReady porting kit**
		- HLS + FairPlay (iOS 10)
	
- HTML5
	- Protocol vs DRM
	
	|  Platform | DRM - Streaming |  ABS |
	|:---------:|:---------------:|:----:|
	|   Chrome  |     Widevine    | DASH |
	|  Firefox  |     Widevine    | DASH |
	| IE11/Edge |    PlayReady    | DASH |
	|   Safari  |     Fairplay    |  HLS |	

	- DASH CC Support
	- HLS Additional audio/subtitle supports
- Integrate with license server