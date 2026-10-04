'use strict';

window.Swal = window.Swal.mixin({
    reverseButtons: true,
    confirmButtonColor: 'var(--swal-confirm-bg, #315bd6)',
    denyButtonColor: 'var(--swal-neutral-bg, #505866)',
    cancelButtonColor: 'var(--swal-neutral-bg, #505866)',
});

function getSwalLuminance(channels) {
    return channels
        .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function getSwalColorChannels(color, fallback) {
    if (!CSS.supports('color', color)) {
        console.warn('Invalid dialog theme color:', color);
        color = fallback;
    }

    const probe = document.createElement('span');
    probe.style.color = color;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const resolved = window.getComputedStyle(probe).color;
    probe.remove();

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not resolve dialog theme colors: canvas is unavailable');
    context.fillStyle = resolved;
    context.fillRect(0, 0, 1, 1);
    return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
}

function getSwalButtonPalette(channels) {
    const luminance = getSwalLuminance(channels);
    const darkInk = (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05);

    return {
        background: `rgb(${channels.join(', ')})`,
        ink: darkInk ? '#000000' : '#ffffff',
        hover: darkInk ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    };
}

function getSwalJoinPalette(channels, hoverChannels) {
    const darkenForWhite = (channels, minimumContrast) => {
        for (let percent = 100; percent >= 0; percent--) {
            const candidate = channels.map((channel) => Math.floor((channel * percent) / 100));
            if (1.05 / (getSwalLuminance(candidate) + 0.05) >= minimumContrast) return candidate;
        }
        throw new Error('Could not create an accessible Join meeting button color');
    };
    const background = darkenForWhite(channels, 6);
    const hover = darkenForWhite(
        hoverChannels || background.map((channel) => Math.round(channel + (255 - channel) * 0.08)),
        4.5
    );
    return {
        background: `rgb(${background.join(', ')})`,
        hoverBackground: `rgb(${hover.join(', ')})`,
    };
}

function setSwalTheme(vars) {
    const primary = getSwalColorChannels(
        vars['--swal-confirm-bg'] || vars['--room-switch-accent'] || vars['--dd-color'] || '#315bd6',
        '#315bd6'
    );
    const neutral = getSwalColorChannels(vars['--swal-neutral-bg'] || vars['--select-bg'] || '#505866', '#505866');
    for (const [name, palette] of [
        ['confirm', getSwalButtonPalette(primary)],
        ['neutral', getSwalButtonPalette(neutral)],
    ]) {
        document.documentElement.style.setProperty(`--swal-${name}-bg`, palette.background);
        document.documentElement.style.setProperty(`--swal-${name}-ink`, palette.ink);
        document.documentElement.style.setProperty(`--swal-${name}-hover`, palette.hover);
    }
    const join = getSwalJoinPalette(
        vars['--swal-join-bg'] ? getSwalColorChannels(vars['--swal-join-bg'], '#315bd6') : primary,
        vars['--swal-join-hover-bg'] ? getSwalColorChannels(vars['--swal-join-hover-bg'], '#315bd6') : undefined
    );
    document.documentElement.style.setProperty('--swal-join-bg', join.background);
    document.documentElement.style.setProperty('--swal-join-hover-bg', join.hoverBackground);
}
