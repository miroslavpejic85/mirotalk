'use strict';

function popup(icon, text, position = 'center') {
    const options = {
        background: 'rgba(0, 0, 0, 0.7)',
        position,
        icon,
        color: '#FFFFFF',
        confirmButtonColor: '#1A84F5',
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    };
    if (['success', 'info'].includes(icon)) {
        return showSwalToast({ ...options, position: position === 'center' ? 'top-end' : position, titleText: text });
    }
    return Swal.fire({ ...options, title: icon === 'warning' ? 'Warning' : 'Error', text });
}
//...
