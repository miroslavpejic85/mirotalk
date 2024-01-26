/**
 * Toggle screen sharing and handle related actions
 * @param {boolean} init - Indicates if it's the initial screen share state
 */
async function toggleDisplayMode(init = false) {
    elemDisplay(carouselContainer, !isDisplayModeOn, 'flex');
    elemDisplay(myVideoAvatarImage, isDisplayModeOn);

    myVideoPinBtn.click();
    adaptAspectRatio();
    // displayModeBtn.classList

    isDisplayModeOn = !isDisplayModeOn

    return;
    try {
        // debugger;
        // adaptAspectRatio()
        // hideMeBtn.click()
        // return

        // Set screen frame rate
        screenMaxFrameRate = parseInt(screenFpsSelect.value, 10);
        const constraints = {
            audio: false,
            video: { frameRate: screenMaxFrameRate },
        };

        // Store webcam video status before screen sharing
        if (!isScreenStreaming) {
            myVideoStatusBefore = myVideoStatus;
            console.log('My video status before screen sharing: ' + myVideoStatusBefore);
        } else {
            if (!useVideo && !useAudio) {
                return handleToggleScreenException('Audio and Video are disabled', init);
            }
        }

        // Get screen or webcam media stream based on current state
        const screenMediaPromise = isScreenStreaming
            ? await navigator.mediaDevices.getUserMedia(await getAudioVideoConstraints())
            : await navigator.mediaDevices.getDisplayMedia(constraints);

        if (screenMediaPromise) {
            isVideoPrivacyActive = false;
            emitPeerStatus('privacy', isVideoPrivacyActive);

            isScreenStreaming = !isScreenStreaming;
            myScreenStatus = isScreenStreaming;

            if (isScreenStreaming) {
                setMyVideoStatusTrue();
                emitPeersAction('screenStart');
            } else {
                emitPeersAction('screenStop');
                adaptAspectRatio();
                // Reset zoom
                myVideo.style.transform = '';
                myVideo.style.transformOrigin = 'center';
            }

            await emitPeerStatus('screen', myScreenStatus);

            await stopLocalVideoTrack();
            await refreshMyLocalStream(screenMediaPromise);
            await refreshMyStreamToPeers(screenMediaPromise);

            if (init) {
                // Handle init media stream
                if (initStream) await stopTracks(initStream);
                initStream = screenMediaPromise;
                if (hasVideoTrack(initStream)) {
                    const newInitStream = new MediaStream([initStream.getVideoTracks()[0]]);
                    elemDisplay(initVideo, true, 'block');
                    initVideo.classList.toggle('mirror');
                    initVideo.srcObject = newInitStream;
                    disable(initVideoSelect, isScreenStreaming);
                    disable(initVideoBtn, isScreenStreaming);
                } else {
                    elemDisplay(initVideo, false);
                }
            }

            // Disable cam video when screen sharing stops
            if (!init && !isScreenStreaming && !myVideoStatusBefore) setMyVideoOff(myPeerName);
            // Enable cam video when screen sharing stops
            if (!init && !isScreenStreaming && myVideoStatusBefore) setMyVideoStatusTrue();

            myVideo.classList.toggle('mirror');
            setScreenSharingStatus(isScreenStreaming);

            if (myVideoAvatarImage && !useVideo) {
                isScreenStreaming
                    ? elemDisplay(myVideoAvatarImage, false)
                    : elemDisplay(myVideoAvatarImage, true, 'block');
            }

            if (myPrivacyBtn) {
                isScreenStreaming ? elemDisplay(myPrivacyBtn, false) : elemDisplay(myPrivacyBtn, true);
            }

            if (isScreenStreaming || isVideoPinned) myVideoPinBtn.click();
        }
    } catch (err) {
        err.name === 'NotAllowedError'
            ? console.error('Screen sharing permission was denied by the user.')
            : await handleToggleScreenException(`[Warning] Unable to share the screen: ${err}`, init);
        if (init) return;
    }
}
