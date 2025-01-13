'use strict';

function popup(icon, text, position = 'center') {
    Swal.fire({
        background: 'rgba(0, 0, 0, 0.7)',
        position: position,
        icon: icon,
        text: text,
        color: '#FFFFFF',
        confirmButtonColor: '#1A84F5',
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    });
}
//...
