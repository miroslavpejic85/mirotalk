(function () {
    'use strict';

    const networkSentValue = document.getElementById('networkSentValue');
    const networkReceivedValue = document.getElementById('networkReceivedValue');
    const networkPacketLossValue = document.getElementById('networkPacketLossValue');
    const networkJitterValue = document.getElementById('networkJitterValue');
    const networkRttValue = document.getElementById('networkRttValue');
    const networkUploadQuality = document.getElementById('networkUploadQuality');
    const networkDownloadQuality = document.getElementById('networkDownloadQuality');
    const networkOverallQuality = document.getElementById('networkOverallQuality');

    const networkBitrateChart = document.getElementById('networkBitrateChart');
    const networkLatencyChart = document.getElementById('networkLatencyChart');
    const mySettings = document.getElementById('mySettings');
    const tabNetwork = document.getElementById('tabNetwork');
    const tabNetworkBtn = document.getElementById('tabNetworkBtn');

    const statsInterval = 1000;
    const networkChartMaxPoints = 60;
    const qualityClassNames = [
        'network-quality--excellent',
        'network-quality--good',
        'network-quality--fair',
        'network-quality--poor',
    ];

    const networkUiStates = {
        COLLECTING: 'collecting',
        NO_TRAFFIC: 'no_traffic',
        LIVE: 'live',
    };

    const networkState = {
        lastSnapshot: null,
        bitrateHistory: { sent: [], received: [] },
        latencyHistory: { jitter: [], rtt: [] },
        uiState: networkUiStates.COLLECTING,
        wasVisible: false,
    };

    function tLabel(text) {
        if (window.i18n && typeof window.i18n.t === 'function') {
            return window.i18n.t(text, 'labels');
        }
        return text;
    }

    function getPeerConnectionsList() {
        if (typeof peerConnections !== 'object' || !peerConnections) return [];
        return Object.values(peerConnections);
    }

    function isNetworkPanelVisible() {
        if (!mySettings || !tabNetwork || !tabNetworkBtn) return false;
        const settingsVisible = mySettings.offsetParent !== null;
        const networkTabActive = tabNetworkBtn.classList.contains('active');
        return settingsVisible && networkTabActive;
    }

    async function getNetworkStats(pc) {
        const stats = {
            bytesSent: 0,
            bytesReceived: 0,
            packetsLost: 0,
            packetsReceived: 0,
            jitterSamples: [],
            rttSamples: [],
        };

        if (!pc || typeof pc.getStats !== 'function') return stats;

        try {
            const reports = await pc.getStats();
            let fallbackBytesSent = 0;
            let fallbackBytesReceived = 0;
            const selectedCandidatePairIds = new Set();
            const candidatePairs = [];

            reports.forEach((report) => {
                if (!report || !report.type) return;

                if (report.type === 'outbound-rtp' && !report.isRemote) {
                    stats.bytesSent += report.bytesSent || 0;
                }

                if (report.type === 'inbound-rtp' && !report.isRemote) {
                    stats.bytesReceived += report.bytesReceived || 0;
                    stats.packetsLost += report.packetsLost || 0;
                    stats.packetsReceived += report.packetsReceived || 0;
                    if (typeof report.jitter === 'number') stats.jitterSamples.push(report.jitter);
                }

                if (report.type === 'remote-inbound-rtp' && typeof report.roundTripTime === 'number') {
                    stats.rttSamples.push(report.roundTripTime);
                }

                if (report.type === 'candidate-pair' && typeof report.currentRoundTripTime === 'number') {
                    stats.rttSamples.push(report.currentRoundTripTime);
                }

                if (report.type === 'candidate-pair') {
                    candidatePairs.push(report);
                }

                if (report.type === 'transport' && report.selectedCandidatePairId) {
                    selectedCandidatePairIds.add(report.selectedCandidatePairId);
                }
            });

            const preferredPairs = candidatePairs.filter(
                (pair) =>
                    selectedCandidatePairIds.has(pair.id) ||
                    pair.nominated === true ||
                    pair.selected === true ||
                    pair.state === 'succeeded'
            );

            preferredPairs.forEach((pair) => {
                if (typeof pair.bytesSent === 'number') fallbackBytesSent = Math.max(fallbackBytesSent, pair.bytesSent);
                if (typeof pair.bytesReceived === 'number')
                    fallbackBytesReceived = Math.max(fallbackBytesReceived, pair.bytesReceived);
            });

            if (fallbackBytesSent > 0) stats.bytesSent = Math.max(stats.bytesSent, fallbackBytesSent);
            if (fallbackBytesReceived > 0) stats.bytesReceived = Math.max(stats.bytesReceived, fallbackBytesReceived);
        } catch (error) {
            console.warn('[networkStats] failed to collect stats', error);
        }

        return stats;
    }

    function average(values) {
        if (!values.length) return 0;
        const sum = values.reduce((total, value) => total + value, 0);
        return sum / values.length;
    }

    function formatBitrate(bitsPerSecond) {
        if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return '0 b';
        const units = ['b', 'kb', 'mb', 'gb'];
        let value = bitsPerSecond;
        let unitIndex = 0;

        while (value >= 1000 && unitIndex < units.length - 1) {
            value /= 1000;
            unitIndex++;
        }

        const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
        return `${value.toFixed(decimals)} ${units[unitIndex]}`;
    }

    function formatMilliseconds(milliseconds) {
        if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0.00 ms';
        return `${milliseconds.toFixed(2)} ms`;
    }

    function getBitrateQuality(bitrate) {
        if (!Number.isFinite(bitrate) || bitrate <= 0) return { label: 'No traffic', level: 'poor' };
        if (bitrate >= 2_000_000) return { label: 'Excellent', level: 'excellent' };
        if (bitrate >= 1_000_000) return { label: 'Good', level: 'good' };
        if (bitrate >= 500_000) return { label: 'Fair', level: 'fair' };
        return { label: 'Poor', level: 'poor' };
    }

    function getConnectionQuality(packetLossPercentage, jitterMs, rttMs) {
        if (packetLossPercentage > 5 || rttMs > 250 || jitterMs > 40) return { label: 'Poor', level: 'poor' };
        if (packetLossPercentage > 2 || rttMs > 150 || jitterMs > 20) return { label: 'Fair', level: 'fair' };
        if (packetLossPercentage > 1 || rttMs > 90 || jitterMs > 10) return { label: 'Good', level: 'good' };
        return { label: 'Excellent', level: 'excellent' };
    }

    function setQualityValue(element, quality) {
        if (!element) return;
        element.classList.add('network-quality');
        element.classList.remove(...qualityClassNames);
        element.classList.add(`network-quality--${quality.level}`);
        element.textContent = quality.label;
    }

    function setQualityText(element, text) {
        if (!element) return;
        element.classList.add('network-quality');
        element.classList.remove(...qualityClassNames);
        element.textContent = text;
    }

    function pushSeriesPoint(series, value) {
        series.push(Number.isFinite(value) ? Math.max(0, value) : 0);
        if (series.length > networkChartMaxPoints) series.shift();
    }

    function renderLineChart(canvas, seriesList, emptyLabel = '') {
        if (!canvas) return;

        const cssWidth = canvas.clientWidth || 300;
        const cssHeight = canvas.clientHeight || 120;
        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.max(1, Math.floor(cssWidth * dpr));
        const targetHeight = Math.max(1, Math.floor(cssHeight * dpr));

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.scale(dpr, dpr);

        const left = 8;
        const right = Math.max(left + 1, cssWidth - 8);
        const top = 8;
        const bottom = Math.max(top + 1, cssHeight - 8);
        const plotWidth = right - left;
        const plotHeight = bottom - top;

        const values = seriesList.flatMap((serie) => serie.values);
        const maxValue = Math.max(1, ...values);
        const hasVisibleValues = values.some((value) => Number.isFinite(value) && value > 0);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
            const y = top + (plotHeight * i) / 3;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.stroke();
        }

        const denominator = Math.max(1, networkChartMaxPoints - 1);

        seriesList.forEach((serie) => {
            if (!serie.values.length) return;
            ctx.strokeStyle = serie.color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            serie.values.forEach((value, index) => {
                const x = left + (plotWidth * index) / denominator;
                const normalized = Math.min(1, Math.max(0, value / maxValue));
                const y = bottom - normalized * plotHeight;
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        });

        if (!hasVisibleValues && emptyLabel) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
            ctx.font = "600 12px 'Inter', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emptyLabel, cssWidth / 2, cssHeight / 2);
        }
    }

    function renderGraphs(labels = {}) {
        const defaultLabels =
            networkState.uiState === networkUiStates.COLLECTING
                ? { bitrate: tLabel('Collecting bitrate samples...'), latency: tLabel('Collecting latency samples...') }
                : networkState.uiState === networkUiStates.NO_TRAFFIC
                  ? { bitrate: tLabel('No traffic yet'), latency: tLabel('No traffic yet') }
                  : { bitrate: '', latency: '' };

        const mergedLabels = {
            bitrate: labels.bitrate !== undefined ? labels.bitrate : defaultLabels.bitrate,
            latency: labels.latency !== undefined ? labels.latency : defaultLabels.latency,
        };

        renderLineChart(
            networkBitrateChart,
            [
                { values: networkState.bitrateHistory.sent, color: '#4ecb71' },
                { values: networkState.bitrateHistory.received, color: '#5aa8ff' },
            ],
            mergedLabels.bitrate
        );
        renderLineChart(
            networkLatencyChart,
            [
                { values: networkState.latencyHistory.jitter, color: '#f6c453' },
                { values: networkState.latencyHistory.rtt, color: '#ff8f5a' },
            ],
            mergedLabels.latency
        );
    }

    function resetSnapshot() {
        networkState.lastSnapshot = null;
    }

    function clearChartHistory() {
        networkState.bitrateHistory.sent = [];
        networkState.bitrateHistory.received = [];
        networkState.latencyHistory.jitter = [];
        networkState.latencyHistory.rtt = [];
        renderGraphs();
    }

    function updateNetworkUiState(state) {
        networkState.uiState = state;

        if (state === networkUiStates.COLLECTING) {
            if (networkSentValue) networkSentValue.textContent = tLabel('Collecting...');
            if (networkReceivedValue) networkReceivedValue.textContent = tLabel('Collecting...');
            if (networkPacketLossValue) networkPacketLossValue.textContent = '--';
            if (networkJitterValue) networkJitterValue.textContent = '--';
            if (networkRttValue) networkRttValue.textContent = '--';
            setQualityText(networkUploadQuality, tLabel('Collecting...'));
            setQualityText(networkDownloadQuality, tLabel('Collecting...'));
            setQualityText(networkOverallQuality, tLabel('Collecting...'));
            renderGraphs({
                bitrate: tLabel('Collecting bitrate samples...'),
                latency: tLabel('Collecting latency samples...'),
            });
            return;
        }

        if (state === networkUiStates.NO_TRAFFIC) {
            if (networkSentValue) networkSentValue.textContent = '0 b';
            if (networkReceivedValue) networkReceivedValue.textContent = '0 b';
            if (networkPacketLossValue) networkPacketLossValue.textContent = '0.00%';
            if (networkJitterValue) networkJitterValue.textContent = '0.00 ms';
            if (networkRttValue) networkRttValue.textContent = '0.00 ms';
            setQualityText(networkUploadQuality, tLabel('No traffic'));
            setQualityText(networkDownloadQuality, tLabel('No traffic'));
            setQualityText(networkOverallQuality, tLabel('No traffic'));
            renderGraphs({
                bitrate: tLabel('No traffic yet'),
                latency: tLabel('No traffic yet'),
            });
            return;
        }
    }

    function updateNetworkUi(metrics) {
        networkState.uiState = networkUiStates.LIVE;

        const {
            packetLossPercentage,
            jitterMs,
            rttMs,
            sentBitrate,
            receivedBitrate,
            connectionQuality,
            uploadQuality,
            downloadQuality,
        } = metrics;

        if (networkSentValue) networkSentValue.textContent = formatBitrate(sentBitrate);
        if (networkReceivedValue) networkReceivedValue.textContent = formatBitrate(receivedBitrate);
        if (networkPacketLossValue)
            networkPacketLossValue.textContent = `${Math.max(0, packetLossPercentage).toFixed(2)}%`;
        if (networkJitterValue) networkJitterValue.textContent = formatMilliseconds(jitterMs);
        if (networkRttValue) networkRttValue.textContent = formatMilliseconds(rttMs);
        setQualityValue(networkUploadQuality, uploadQuality);
        setQualityValue(networkDownloadQuality, downloadQuality);
        setQualityValue(networkOverallQuality, connectionQuality);
    }

    async function updateNetworkStats() {
        const isVisible = isNetworkPanelVisible();
        if (!isVisible) {
            networkState.wasVisible = false;
            return;
        }

        if (!networkState.wasVisible) {
            networkState.wasVisible = true;
            resetSnapshot();
        }

        const connections = getPeerConnectionsList();
        const perPeerStats = await Promise.all(connections.map((pc) => getNetworkStats(pc)));
        const now = performance.now();

        const snapshot = perPeerStats.reduce(
            (acc, stats) => {
                acc.bytesSent += stats.bytesSent;
                acc.bytesReceived += stats.bytesReceived;
                acc.packetsLost += stats.packetsLost;
                acc.packetsReceived += stats.packetsReceived;
                if (stats.jitterSamples.length) acc.jitterSamples.push(...stats.jitterSamples);
                if (stats.rttSamples.length) acc.rttSamples.push(...stats.rttSamples);
                return acc;
            },
            { bytesSent: 0, bytesReceived: 0, packetsLost: 0, packetsReceived: 0, jitterSamples: [], rttSamples: [] }
        );

        let sentBitrate = 0;
        let receivedBitrate = 0;
        let packetLossPercentage = 0;
        const hasPreviousSnapshot = Boolean(networkState.lastSnapshot);

        if (hasPreviousSnapshot) {
            const elapsedMs = now - networkState.lastSnapshot.timestamp;
            if (elapsedMs > 0) {
                const seconds = elapsedMs / 1000;
                const sentDelta = Math.max(0, snapshot.bytesSent - networkState.lastSnapshot.bytesSent);
                const receivedDelta = Math.max(0, snapshot.bytesReceived - networkState.lastSnapshot.bytesReceived);
                const lostDelta = Math.max(0, snapshot.packetsLost - networkState.lastSnapshot.packetsLost);
                const packetsReceivedDelta = Math.max(
                    0,
                    snapshot.packetsReceived - networkState.lastSnapshot.packetsReceived
                );

                sentBitrate = (sentDelta * 8) / seconds;
                receivedBitrate = (receivedDelta * 8) / seconds;

                const packetTotalDelta = lostDelta + packetsReceivedDelta;
                packetLossPercentage = packetTotalDelta > 0 ? (lostDelta / packetTotalDelta) * 100 : 0;
            }
        }

        networkState.lastSnapshot = {
            timestamp: now,
            bytesSent: snapshot.bytesSent,
            bytesReceived: snapshot.bytesReceived,
            packetsLost: snapshot.packetsLost,
            packetsReceived: snapshot.packetsReceived,
        };

        const jitterMs = average(snapshot.jitterSamples) * 1000;
        const rttMs = average(snapshot.rttSamples) * 1000;
        const connectionQuality = getConnectionQuality(packetLossPercentage, jitterMs, rttMs);
        const uploadQuality = getBitrateQuality(sentBitrate);
        const downloadQuality = getBitrateQuality(receivedBitrate);

        if (!hasPreviousSnapshot) {
            clearChartHistory();
            updateNetworkUiState(networkUiStates.COLLECTING);
            return;
        }

        const hasUsableTraffic =
            sentBitrate > 0 ||
            receivedBitrate > 0 ||
            snapshot.bytesSent > 0 ||
            snapshot.bytesReceived > 0 ||
            snapshot.packetsReceived > 0 ||
            snapshot.packetsLost > 0 ||
            snapshot.jitterSamples.length > 0 ||
            snapshot.rttSamples.length > 0;

        if (!hasUsableTraffic) {
            clearChartHistory();
            updateNetworkUiState(networkUiStates.NO_TRAFFIC);
            return;
        }

        pushSeriesPoint(networkState.bitrateHistory.sent, sentBitrate);
        pushSeriesPoint(networkState.bitrateHistory.received, receivedBitrate);
        pushSeriesPoint(networkState.latencyHistory.jitter, jitterMs);
        pushSeriesPoint(networkState.latencyHistory.rtt, rttMs);

        updateNetworkUi({
            packetLossPercentage,
            jitterMs,
            rttMs,
            sentBitrate,
            receivedBitrate,
            connectionQuality,
            uploadQuality,
            downloadQuality,
        });

        renderGraphs();
    }

    setInterval(() => {
        updateNetworkStats().catch((error) => console.warn('[networkStats] update failed', error));
    }, statsInterval);

    if (tabNetworkBtn) {
        tabNetworkBtn.addEventListener('click', () => {
            updateNetworkStats().catch((error) => console.warn('[networkStats] update failed', error));
        });
    }

    const visibilityObserver =
        mySettings && tabNetworkBtn
            ? new MutationObserver(() => {
                  const isVisible = isNetworkPanelVisible();
                  if (isVisible === networkState.wasVisible) return;
                  updateNetworkStats().catch((error) => console.warn('[networkStats] update failed', error));
              })
            : null;

    if (visibilityObserver) {
        visibilityObserver.observe(mySettings, { attributes: true, attributeFilter: ['style', 'class'] });
        visibilityObserver.observe(tabNetworkBtn, { attributes: true, attributeFilter: ['class'] });
    }

    let resizeRenderFrame = 0;
    window.addEventListener('resize', () => {
        if (resizeRenderFrame) {
            cancelAnimationFrame(resizeRenderFrame);
        }
        resizeRenderFrame = requestAnimationFrame(() => {
            resizeRenderFrame = 0;
            if (!isNetworkPanelVisible()) return;
            renderGraphs();
        });
    });

    updateNetworkStats().catch((error) => console.warn('[networkStats] update failed', error));
})();
