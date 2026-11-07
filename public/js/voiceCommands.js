'use strict';

/**
 * Voice commands: control the room hands-free with the browser Web Speech API.
 * The SpeechRecognition engine is shared with the captions (see speechRecognition.js),
 * the command language follows the selected recognition language.
 *
 * Commands that the browser only allows from a real user gesture (screen sharing, snapshot,
 * full screen, picture-in-picture, file picker, opening new tabs) are intentionally not supported.
 */
const voiceCommandHandlers = {
    en: {
        langCode: 'en-US',
        commands: {
            shareRoom: 'room',
            hideMe: 'hide me',
            showMe: 'show me',
            leaveRoom: 'exit the room',
            audioOn: 'start the audio',
            audioOff: 'stop the audio',
            videoOn: 'start the video',
            videoOff: 'stop the video',
            screenOff: 'stop the screen',
            chatOn: 'open the chat',
            chatOff: 'close the chat',
            pollOn: 'open the poll',
            pollOff: 'close the poll',
            breakoutRoomOn: 'open the breakout room',
            breakoutRoomOff: 'close the breakout room',
            editorOn: 'open the editor',
            editorOff: 'close the editor',
            toggleTr: 'toggle transcription',
            whiteboardOn: 'open the whiteboard',
            whiteboardOff: 'close the whiteboard',
            recordingOn: 'start the recording',
            recordingPause: 'pause the recording',
            recordingResume: 'resume the recording',
            recordingOff: 'stop the recording',
            settingsOn: 'open the settings',
            settingsOff: 'close the settings',
            participantsOn: 'show the participants',
            participantsOff: 'hide the participants',
            participantsVideoOff: 'stop the participants video',
            participantsAudioOff: 'stop the participants audio',
            participantsKickOut: 'kick out the participants',
            videoShareOn: 'share the video',
            videoShareOff: 'close the video',
            swapCamera: 'swap the camera',
            raiseHand: 'raise the hand',
            lowerHand: 'lower the hand',
            roomLock: 'lock the room',
            roomUnlock: 'unlock the room',
            about: 'show the about',
            emojiOn: 'open the emoji',
            chatClean: 'clean the chat',
            chatSave: 'save the chat',
            whiteboardUndo: 'undo the whiteboard',
            whiteboardRedo: 'redo the whiteboard',
            whiteboardClean: 'clean the whiteboard',
            whiteboardSave: 'save the whiteboard',
            settingsAudio: 'open the audio settings',
            settingsVideo: 'open the video settings',
            settingsRecording: 'open the recording settings',
            settingsVideoEffects: 'open the video effects',
            settingsVirtualBackground: 'open the virtual background',
            settingsLanguages: 'open the language settings',
            settingsShortcuts: 'open the shortcuts',
            recognizeEnglish: 'recognize english',
            recognizeBangla: 'recognize bangla',
            recognizeItalian: 'recognize italian',
            recognizeSpanish: 'recognize spanish',
            recognizeFrench: 'recognize french',
            recognizeGerman: 'recognize german',
            recognizeJapanese: 'recognize japanese',
            recognizePortuguese: 'recognize portuguese',
            recognizeChinese: 'recognize chinese',
            recognizeArabic: 'recognize arabic',
            stopRecognition: 'stop the voice recognition',
        },
    },
    bn: {
        langCode: 'bn-BD',
        commands: {
            shareRoom: 'রুম শেয়ার করো',
            hideMe: 'আমাকে লুকাও',
            showMe: 'আমাকে দেখাও',
            leaveRoom: 'রুম থেকে বের হও',
            audioOn: 'অডিও চালু করো',
            audioOff: 'অডিও বন্ধ করো',
            videoOn: 'ভিডিও চালু করো',
            videoOff: 'ভিডিও বন্ধ করো',
            screenOff: 'স্ক্রিন বন্ধ করো',
            chatOn: 'চ্যাট খুলো',
            chatOff: 'চ্যাট বন্ধ করো',
            pollOn: 'পোল খুলো',
            pollOff: 'পোল বন্ধ করো',
            breakoutRoomOn: 'ব্রেকআউট রুম খুলো',
            breakoutRoomOff: 'ব্রেকআউট রুম বন্ধ করো',
            editorOn: 'এডিটর খুলো',
            editorOff: 'এডিটর বন্ধ করো',
            toggleTr: 'ট্রান্সক্রিপশন চালু/বন্ধ করো',
            whiteboardOn: 'হোয়াইটবোর্ড খুলো',
            whiteboardOff: 'হোয়াইটবোর্ড বন্ধ করো',
            recordingOn: 'রেকর্ডিং শুরু করো',
            recordingPause: 'রেকর্ডিং বিরতি দাও',
            recordingResume: 'রেকর্ডিং আবার শুরু করো',
            recordingOff: 'রেকর্ডিং বন্ধ করো',
            settingsOn: 'সেটিংস খুলো',
            settingsOff: 'সেটিংস বন্ধ করো',
            participantsOn: 'অংশগ্রহণকারীদের দেখাও',
            participantsOff: 'অংশগ্রহণকারীদের লুকাও',
            participantsVideoOff: 'অংশগ্রহণকারীদের ভিডিও বন্ধ করো',
            participantsAudioOff: 'অংশগ্রহণকারীদের অডিও বন্ধ করো',
            participantsKickOut: 'অংশগ্রহণকারীদের বের করে দাও',
            videoShareOn: 'ভিডিও শেয়ার করো',
            videoShareOff: 'ভিডিও শেয়ার বন্ধ করো',
            swapCamera: 'ক্যামেরা পরিবর্তন করো',
            raiseHand: 'হাত তুলো',
            lowerHand: 'হাত নামাও',
            roomLock: 'রুম লক করো',
            roomUnlock: 'রুম আনলক করো',
            about: 'সম্পর্কিত দেখাও',
            emojiOn: 'ইমোজি খুলো',
            chatClean: 'চ্যাট পরিষ্কার করো',
            chatSave: 'চ্যাট সংরক্ষণ করো',
            whiteboardUndo: 'হোয়াইটবোর্ড আনডু করো',
            whiteboardRedo: 'হোয়াইটবোর্ড রিডু করো',
            whiteboardClean: 'হোয়াইটবোর্ড পরিষ্কার করো',
            whiteboardSave: 'হোয়াইটবোর্ড সংরক্ষণ করো',
            settingsAudio: 'অডিও সেটিংস খুলো',
            settingsVideo: 'ভিডিও সেটিংস খুলো',
            settingsRecording: 'রেকর্ডিং সেটিংস খুলো',
            settingsVideoEffects: 'ভিডিও ইফেক্ট খুলো',
            settingsVirtualBackground: 'ভার্চুয়াল ব্যাকগ্রাউন্ড খুলো',
            settingsLanguages: 'ভাষা সেটিংস খুলো',
            settingsShortcuts: 'শর্টকাট খুলো',
            recognizeEnglish: 'ইংরেজিতে করো',
            recognizeItalian: 'ইতালীয় চেনা',
            recognizeSpanish: 'স্পেনীয় চেনা',
            recognizeFrench: 'ফরাসি চেনা',
            recognizeGerman: 'জার্মান চেনা',
            recognizeJapanese: 'জাপানি চেনা',
            recognizePortuguese: 'পর্তুগিজ চেনা',
            recognizeChinese: 'চীনা চেনা',
            recognizeArabic: 'আরবি চেনা',
            stopRecognition: 'ভয়েস রিকগনিশন বন্ধ করো',
        },
    },
    es: {
        langCode: 'es-ES',
        commands: {
            shareRoom: 'compartir sala',
            hideMe: 'esconderme',
            showMe: 'muéstrame',
            leaveRoom: 'salir de la sala',
            audioOn: 'activar audio',
            audioOff: 'desactivar audio',
            videoOn: 'activar video',
            videoOff: 'desactivar video',
            screenOff: 'desactivar pantalla',
            chatOn: 'abrir chat',
            chatOff: 'cerrar chat',
            pollOn: 'abrir encuesta',
            pollOff: 'cerrar encuesta',
            breakoutRoomOn: 'abrir sala de grupo',
            breakoutRoomOff: 'cerrar sala de grupo',
            editorOn: 'abrir editor',
            editorOff: 'cerrar editor',
            toggleTr: 'alternar transcripción',
            whiteboardOn: 'abrir pizarra',
            whiteboardOff: 'cerrar pizarra',
            recordingOn: 'comenzar grabación',
            recordingPause: 'pausar grabación',
            recordingResume: 'reanudar grabación',
            recordingOff: 'detener grabación',
            settingsOn: 'abrir configuraciones',
            settingsOff: 'cerrar configuraciones',
            participantsOn: 'mostrar participantes',
            participantsOff: 'ocultar participantes',
            participantsVideoOff: 'desactivar video de participantes',
            participantsAudioOff: 'desactivar audio de participantes',
            participantsKickOut: 'expulsar participantes',
            videoShareOn: 'compartir video',
            videoShareOff: 'dejar de compartir video',
            swapCamera: 'cambiar cámara',
            raiseHand: 'levantar la mano',
            lowerHand: 'bajar la mano',
            roomLock: 'bloquear la sala',
            roomUnlock: 'desbloquear la sala',
            about: 'mostrar información',
            emojiOn: 'abrir emoji',
            chatClean: 'limpiar chat',
            chatSave: 'guardar chat',
            whiteboardUndo: 'deshacer pizarra',
            whiteboardRedo: 'rehacer pizarra',
            whiteboardClean: 'limpiar pizarra',
            whiteboardSave: 'guardar pizarra',
            settingsAudio: 'abrir configuración de audio',
            settingsVideo: 'abrir configuración de video',
            settingsRecording: 'abrir configuración de grabación',
            settingsVideoEffects: 'abrir efectos de video',
            settingsVirtualBackground: 'abrir fondo virtual',
            settingsLanguages: 'abrir configuración de idioma',
            settingsShortcuts: 'abrir atajos',
            recognizeEnglish: 'reconocer inglés',
            recognizeBangla: 'reconocer bengalí',
            recognizeItalian: 'reconocer italiano',
            recognizeSpanish: 'reconocer español',
            recognizeFrench: 'reconocer francés',
            recognizeGerman: 'reconocer alemán',
            recognizeJapanese: 'reconocer japonés',
            recognizePortuguese: 'reconocer portugués',
            recognizeChinese: 'reconocer chino',
            recognizeArabic: 'reconocer árabe',
            stopRecognition: 'detener el reconocimiento de voz',
        },
    },
    fr: {
        langCode: 'fr-FR',
        commands: {
            shareRoom: 'partager la salle',
            hideMe: 'cachez-moi',
            showMe: 'montrez-moi',
            leaveRoom: 'quitter la salle',
            audioOn: "activer l'audio",
            audioOff: "désactiver l'audio",
            videoOn: 'activer la vidéo',
            videoOff: 'désactiver la vidéo',
            screenOff: "désactiver l'écran",
            chatOn: 'ouvrir le chat',
            chatOff: 'fermer le chat',
            pollOn: 'ouvrir le sondage',
            pollOff: 'fermer le sondage',
            breakoutRoomOn: 'ouvrir la salle de groupe',
            breakoutRoomOff: 'fermer la salle de groupe',
            editorOn: "ouvrir l'éditeur",
            editorOff: "fermer l'éditeur",
            toggleTr: 'basculer la transcription',
            whiteboardOn: 'ouvrir le tableau blanc',
            whiteboardOff: 'fermer le tableau blanc',
            recordingOn: "commencer l'enregistrement",
            recordingPause: "mettre en pause l'enregistrement",
            recordingResume: "reprendre l'enregistrement",
            recordingOff: "arrêter l'enregistrement",
            settingsOn: 'ouvrir les paramètres',
            settingsOff: 'fermer les paramètres',
            participantsOn: 'afficher les participants',
            participantsOff: 'masquer les participants',
            participantsVideoOff: 'désactiver la vidéo des participants',
            participantsAudioOff: "désactiver l'audio des participants",
            participantsKickOut: 'expulser les participants',
            videoShareOn: 'partager la vidéo',
            videoShareOff: 'arrêter le partage de la vidéo',
            swapCamera: 'changer de caméra',
            raiseHand: 'lever la main',
            lowerHand: 'baisser la main',
            roomLock: 'verrouiller la salle',
            roomUnlock: 'déverrouiller la salle',
            about: 'montrer à propos',
            emojiOn: 'ouvrir les émojis',
            chatClean: 'nettoyer le chat',
            chatSave: 'enregistrer le chat',
            whiteboardUndo: 'annuler le tableau blanc',
            whiteboardRedo: 'rétablir le tableau blanc',
            whiteboardClean: 'effacer le tableau blanc',
            whiteboardSave: 'sauvegarder le tableau blanc',
            settingsAudio: 'ouvrir les paramètres audio',
            settingsVideo: 'ouvrir les paramètres vidéo',
            settingsRecording: "ouvrir les paramètres d'enregistrement",
            settingsVideoEffects: 'ouvrir les effets vidéo',
            settingsVirtualBackground: "ouvrir l'arrière-plan virtuel",
            settingsLanguages: 'ouvrir les paramètres de langue',
            settingsShortcuts: 'ouvrir les raccourcis',
            recognizeEnglish: 'reconnaître anglais',
            recognizeBangla: 'reconnaître bengali',
            recognizeItalian: 'reconnaître italien',
            recognizeSpanish: 'reconnaître espagnol',
            recognizeFrench: 'reconnaître français',
            recognizeGerman: 'reconnaître allemand',
            recognizeJapanese: 'reconnaître japonais',
            recognizePortuguese: 'reconnaître portugais',
            recognizeChinese: 'reconnaître chinois',
            recognizeArabic: 'reconnaître arabe',
            stopRecognition: 'arrêter la reconnaissance vocale',
        },
    },
    it: {
        langCode: 'it-IT',
        commands: {
            shareRoom: 'condividi sala',
            hideMe: 'nascondimi',
            showMe: 'fammi vedere',
            leaveRoom: 'esci dalla sala',
            audioOn: 'attiva audio',
            audioOff: 'disattiva audio',
            videoOn: 'attiva video',
            videoOff: 'disattiva video',
            screenOff: 'disattiva schermo',
            chatOn: 'apri chat',
            chatOff: 'chiudi chat',
            pollOn: 'apri sondaggio',
            pollOff: 'chiudi sondaggio',
            breakoutRoomOn: 'apri sala di gruppo',
            breakoutRoomOff: 'chiudi sala di gruppo',
            editorOn: 'apri editor',
            editorOff: 'chiudi editor',
            toggleTr: 'attiva/disattiva trascrizione',
            whiteboardOn: 'apri lavagna',
            whiteboardOff: 'chiudi lavagna',
            recordingOn: 'avvia registrazione',
            recordingPause: 'metti in pausa registrazione',
            recordingResume: 'riprendi registrazione',
            recordingOff: 'ferma registrazione',
            settingsOn: 'apri impostazioni',
            settingsOff: 'chiudi impostazioni',
            participantsOn: 'mostra partecipanti',
            participantsOff: 'nascondi partecipanti',
            participantsVideoOff: 'disattiva video partecipanti',
            participantsAudioOff: 'disattiva audio partecipanti',
            participantsKickOut: 'espelli partecipanti',
            videoShareOn: 'condividi video',
            videoShareOff: 'interrompi condivisione video',
            swapCamera: 'cambia fotocamera',
            raiseHand: 'alza mano',
            lowerHand: 'abbassa mano',
            roomLock: 'blocca sala',
            roomUnlock: 'sblocca sala',
            about: 'mostra informazioni',
            emojiOn: 'apri emoji',
            chatClean: 'pulisci chat',
            chatSave: 'salva chat',
            whiteboardUndo: 'annulla lavagna',
            whiteboardRedo: 'ripeti lavagna',
            whiteboardClean: 'pulisci lavagna',
            whiteboardSave: 'salva lavagna',
            settingsAudio: 'apri impostazioni audio',
            settingsVideo: 'apri impostazioni video',
            settingsRecording: 'apri impostazioni registrazione',
            settingsVideoEffects: 'apri effetti video',
            settingsVirtualBackground: 'apri sfondo virtuale',
            settingsLanguages: 'apri impostazioni lingua',
            settingsShortcuts: 'apri scorciatoie',
            recognizeEnglish: 'riconoscere inglese',
            recognizeBangla: 'riconoscere bengalese',
            recognizeItalian: 'riconoscere italiano',
            recognizeSpanish: 'riconoscere spagnolo',
            recognizeFrench: 'riconoscere francese',
            recognizeGerman: 'riconoscere tedesco',
            recognizeJapanese: 'riconoscere giapponese',
            recognizePortuguese: 'riconoscere portoghese',
            recognizeChinese: 'riconoscere cinese',
            recognizeArabic: 'riconoscere arabo',
            stopRecognition: 'ferma riconoscimento vocale',
        },
    },
    de: {
        langCode: 'de-DE',
        commands: {
            shareRoom: 'Raum teilen',
            hideMe: 'verstecke mich',
            showMe: 'zeige mich',
            leaveRoom: 'Raum verlassen',
            audioOn: 'Audio aktivieren',
            audioOff: 'Audio deaktivieren',
            videoOn: 'Video aktivieren',
            videoOff: 'Video deaktivieren',
            screenOff: 'Bildschirm deaktivieren',
            chatOn: 'Chat öffnen',
            chatOff: 'Chat schließen',
            pollOn: 'Umfrage öffnen',
            pollOff: 'Umfrage schließen',
            breakoutRoomOn: 'Gruppenraum öffnen',
            breakoutRoomOff: 'Gruppenraum schließen',
            editorOn: 'Editor öffnen',
            editorOff: 'Editor schließen',
            toggleTr: 'Transkription umschalten',
            whiteboardOn: 'Whiteboard öffnen',
            whiteboardOff: 'Whiteboard schließen',
            recordingOn: 'Aufnahme starten',
            recordingPause: 'Aufnahme pausieren',
            recordingResume: 'Aufnahme fortsetzen',
            recordingOff: 'Aufnahme stoppen',
            settingsOn: 'Einstellungen öffnen',
            settingsOff: 'Einstellungen schließen',
            participantsOn: 'Teilnehmer anzeigen',
            participantsOff: 'Teilnehmer verstecken',
            participantsVideoOff: 'Teilnehmer Video deaktivieren',
            participantsAudioOff: 'Teilnehmer Audio deaktivieren',
            participantsKickOut: 'Teilnehmer rauswerfen',
            videoShareOn: 'Video teilen',
            videoShareOff: 'Video teilen stoppen',
            swapCamera: 'Kamera wechseln',
            raiseHand: 'Hand heben',
            lowerHand: 'Hand senken',
            roomLock: 'Raum sperren',
            roomUnlock: 'Raum entsperren',
            about: 'Info anzeigen',
            emojiOn: 'Emoji öffnen',
            chatClean: 'Chat leeren',
            chatSave: 'Chat speichern',
            whiteboardUndo: 'Whiteboard rückgängig',
            whiteboardRedo: 'Whiteboard wiederholen',
            whiteboardClean: 'Whiteboard leeren',
            whiteboardSave: 'Whiteboard speichern',
            settingsAudio: 'Audioeinstellungen öffnen',
            settingsVideo: 'Videoeinstellungen öffnen',
            settingsRecording: 'Aufnahmeeinstellungen öffnen',
            settingsVideoEffects: 'Videoeffekte öffnen',
            settingsVirtualBackground: 'virtuellen Hintergrund öffnen',
            settingsLanguages: 'Spracheinstellungen öffnen',
            settingsShortcuts: 'Tastenkürzel öffnen',
            recognizeEnglish: 'Englisch erkennen',
            recognizeBangla: 'Bangla erkennen',
            recognizeItalian: 'Italienisch erkennen',
            recognizeSpanish: 'Spanisch erkennen',
            recognizeFrench: 'Französisch erkennen',
            recognizeGerman: 'Deutsch erkennen',
            recognizeJapanese: 'Japanisch erkennen',
            recognizePortuguese: 'Portugiesisch erkennen',
            recognizeChinese: 'Chinesisch erkennen',
            recognizeArabic: 'Arabisch erkennen',
            stopRecognition: 'Spracherkennung stoppen',
        },
    },
    pt: {
        langCode: 'pt-BR',
        commands: {
            shareRoom: 'compartilhar sala',
            hideMe: 'me esconda',
            showMe: 'me mostre',
            leaveRoom: 'sair da sala',
            audioOn: 'ativar áudio',
            audioOff: 'desativar áudio',
            videoOn: 'ativar vídeo',
            videoOff: 'desativar vídeo',
            screenOff: 'desativar tela',
            chatOn: 'abrir chat',
            chatOff: 'fechar chat',
            pollOn: 'abrir enquete',
            pollOff: 'fechar enquete',
            breakoutRoomOn: 'abrir sala de grupo',
            breakoutRoomOff: 'fechar sala de grupo',
            editorOn: 'abrir editor',
            editorOff: 'fechar editor',
            toggleTr: 'alternar transcrição',
            whiteboardOn: 'abrir quadro branco',
            whiteboardOff: 'fechar quadro branco',
            recordingOn: 'iniciar gravação',
            recordingPause: 'pausar gravação',
            recordingResume: 'retomar gravação',
            recordingOff: 'parar gravação',
            settingsOn: 'abrir configurações',
            settingsOff: 'fechar configurações',
            participantsOn: 'mostrar participantes',
            participantsOff: 'ocultar participantes',
            participantsVideoOff: 'desativar vídeo dos participantes',
            participantsAudioOff: 'desativar áudio dos participantes',
            participantsKickOut: 'expulsar participantes',
            videoShareOn: 'compartilhar vídeo',
            videoShareOff: 'parar de compartilhar vídeo',
            swapCamera: 'trocar câmera',
            raiseHand: 'levantar mão',
            lowerHand: 'abaixar mão',
            roomLock: 'trancar sala',
            roomUnlock: 'destrancar sala',
            about: 'mostrar sobre',
            emojiOn: 'abrir emoji',
            chatClean: 'limpar chat',
            chatSave: 'salvar chat',
            whiteboardUndo: 'desfazer quadro branco',
            whiteboardRedo: 'refazer quadro branco',
            whiteboardClean: 'limpar quadro branco',
            whiteboardSave: 'salvar quadro branco',
            settingsAudio: 'abrir configurações de áudio',
            settingsVideo: 'abrir configurações de vídeo',
            settingsRecording: 'abrir configurações de gravação',
            settingsVideoEffects: 'abrir efeitos de vídeo',
            settingsVirtualBackground: 'abrir fundo virtual',
            settingsLanguages: 'abrir configurações de idioma',
            settingsShortcuts: 'abrir atalhos',
            recognizeEnglish: 'reconhecer inglês',
            recognizeBangla: 'reconhecer bengali',
            recognizeItalian: 'reconhecer italiano',
            recognizeSpanish: 'reconhecer espanhol',
            recognizeFrench: 'reconhecer francês',
            recognizeGerman: 'reconhecer alemão',
            recognizeJapanese: 'reconhecer japonês',
            recognizePortuguese: 'reconhecer português',
            recognizeChinese: 'reconhecer chinês',
            recognizeArabic: 'reconhecer árabe',
            stopRecognition: 'parar reconhecimento de voz',
        },
    },
    ja: {
        langCode: 'ja-JP',
        commands: {
            shareRoom: 'ルームを共有',
            hideMe: '私を隠す',
            showMe: '私を見せる',
            leaveRoom: 'ルームを退出',
            audioOn: 'オーディオを開始',
            audioOff: 'オーディオを停止',
            videoOn: 'ビデオを開始',
            videoOff: 'ビデオを停止',
            screenOff: '画面共有を停止',
            chatOn: 'チャットを開く',
            chatOff: 'チャットを閉じる',
            pollOn: '投票を開く',
            pollOff: '投票を閉じる',
            breakoutRoomOn: 'ブレイクアウトルームを開く',
            breakoutRoomOff: 'ブレイクアウトルームを閉じる',
            editorOn: 'エディターを開く',
            editorOff: 'エディターを閉じる',
            toggleTr: '文字起こしを切り替え',
            whiteboardOn: 'ホワイトボードを開く',
            whiteboardOff: 'ホワイトボードを閉じる',
            recordingOn: '録画を開始',
            recordingPause: '録画を一時停止',
            recordingResume: '録画を再開',
            recordingOff: '録画を停止',
            settingsOn: '設定を開く',
            settingsOff: '設定を閉じる',
            participantsOn: '参加者を表示',
            participantsOff: '参加者を非表示',
            participantsVideoOff: '参加者のビデオを停止',
            participantsAudioOff: '参加者のオーディオを停止',
            participantsKickOut: '参加者を退出させる',
            videoShareOn: 'ビデオを共有',
            videoShareOff: 'ビデオ共有を停止',
            swapCamera: 'カメラを切り替え',
            raiseHand: '手を上げる',
            lowerHand: '手を下げる',
            roomLock: 'ルームをロック',
            roomUnlock: 'ルームをアンロック',
            about: '情報を表示',
            emojiOn: '絵文字を開く',
            chatClean: 'チャットをクリア',
            chatSave: 'チャットを保存',
            whiteboardUndo: 'ホワイトボードを元に戻す',
            whiteboardRedo: 'ホワイトボードをやり直す',
            whiteboardClean: 'ホワイトボードをクリア',
            whiteboardSave: 'ホワイトボードを保存',
            settingsAudio: '音声設定を開く',
            settingsVideo: 'ビデオ設定を開く',
            settingsRecording: '録画設定を開く',
            settingsVideoEffects: 'ビデオエフェクトを開く',
            settingsVirtualBackground: '仮想背景を開く',
            settingsLanguages: '言語設定を開く',
            settingsShortcuts: 'ショートカットを開く',
            recognizeEnglish: '英語に切り替え',
            recognizeBangla: 'ベンガル語に切り替え',
            recognizeItalian: 'イタリア語に切り替え',
            recognizeSpanish: 'スペイン語に切り替え',
            recognizeFrench: 'フランス語に切り替え',
            recognizeGerman: 'ドイツ語に切り替え',
            recognizeJapanese: '日本語に切り替え',
            recognizePortuguese: 'ポルトガル語に切り替え',
            recognizeChinese: '中国語に切り替え',
            recognizeArabic: 'アラビア語に切り替え',
            stopRecognition: '音声認識を停止',
        },
    },
    zh: {
        langCode: 'cmn-Hans-CN',
        commands: {
            shareRoom: '分享房间',
            hideMe: '隐藏我',
            showMe: '展示我',
            leaveRoom: '离开房间',
            audioOn: '开启音频',
            audioOff: '关闭音频',
            videoOn: '开启视频',
            videoOff: '关闭视频',
            screenOff: '关闭屏幕共享',
            chatOn: '打开聊天',
            chatOff: '关闭聊天',
            pollOn: '开启投票',
            pollOff: '关闭投票',
            breakoutRoomOn: '打开分组讨论室',
            breakoutRoomOff: '关闭分组讨论室',
            editorOn: '开启编辑器',
            editorOff: '关闭编辑器',
            toggleTr: '切换字幕',
            whiteboardOn: '开启白板',
            whiteboardOff: '关闭白板',
            recordingOn: '开始录制',
            recordingPause: '暂停录制',
            recordingResume: '恢复录制',
            recordingOff: '停止录制',
            settingsOn: '开启设置',
            settingsOff: '关闭设置',
            participantsOn: '显示参与者',
            participantsOff: '隐藏参与者',
            participantsVideoOff: '关闭参与者视频',
            participantsAudioOff: '关闭参与者音频',
            participantsKickOut: '踢出参与者',
            videoShareOn: '分享视频',
            videoShareOff: '停止分享视频',
            swapCamera: '切换摄像头',
            raiseHand: '举手',
            lowerHand: '放下手',
            roomLock: '锁定房间',
            roomUnlock: '解锁房间',
            about: '显示关于信息',
            emojiOn: '开启表情',
            chatClean: '清空聊天',
            chatSave: '保存聊天',
            whiteboardUndo: '撤销白板',
            whiteboardRedo: '重做白板',
            whiteboardClean: '清空白板',
            whiteboardSave: '保存白板',
            settingsAudio: '开启音频设置',
            settingsVideo: '开启视频设置',
            settingsRecording: '开启录制设置',
            settingsVideoEffects: '开启视频特效',
            settingsVirtualBackground: '开启虚拟背景',
            settingsLanguages: '开启语言设置',
            settingsShortcuts: '开启快捷键',
            recognizeEnglish: '识别英语',
            recognizeBangla: '识别孟加拉语',
            recognizeItalian: '识别意大利语',
            recognizeSpanish: '识别西班牙语',
            recognizeFrench: '识别法语',
            recognizeGerman: '识别德语',
            recognizeJapanese: '识别日语',
            recognizePortuguese: '识别葡萄牙语',
            recognizeChinese: '识别中文',
            recognizeArabic: '识别阿拉伯语',
            stopRecognition: '停止语音识别',
        },
    },
    ar: {
        langCode: 'ar-SA',
        commands: {
            shareRoom: 'مشاركة الغرفة',
            hideMe: 'اخفني',
            showMe: 'أرني',
            leaveRoom: 'مغادرة الغرفة',
            audioOn: 'تشغيل الصوت',
            audioOff: 'إيقاف الصوت',
            videoOn: 'تشغيل الفيديو',
            videoOff: 'إيقاف الفيديو',
            screenOff: 'إيقاف الشاشة',
            chatOn: 'فتح الدردشة',
            chatOff: 'إغلاق الدردشة',
            pollOn: 'فتح الاستطلاع',
            pollOff: 'إغلاق الاستطلاع',
            breakoutRoomOn: 'فتح غرفة فرعية',
            breakoutRoomOff: 'إغلاق غرفة فرعية',
            editorOn: 'فتح المحرر',
            editorOff: 'إغلاق المحرر',
            toggleTr: 'التبديل بين الترجمة',
            whiteboardOn: 'فتح السبورة',
            whiteboardOff: 'إغلاق السبورة',
            recordingOn: 'بدء التسجيل',
            recordingPause: 'إيقاف التسجيل مؤقتاً',
            recordingResume: 'استئناف التسجيل',
            recordingOff: 'إيقاف التسجيل',
            settingsOn: 'فتح الإعدادات',
            settingsOff: 'إغلاق الإعدادات',
            participantsOn: 'عرض المشاركين',
            participantsOff: 'إخفاء المشاركين',
            participantsVideoOff: 'إيقاف فيديو المشاركين',
            participantsAudioOff: 'إيقاف صوت المشاركين',
            participantsKickOut: 'طرد المشاركين',
            videoShareOn: 'مشاركة الفيديو',
            videoShareOff: 'إيقاف مشاركة الفيديو',
            swapCamera: 'تبديل الكاميرا',
            raiseHand: 'رفع اليد',
            lowerHand: 'إنزال اليد',
            roomLock: 'قفل الغرفة',
            roomUnlock: 'فتح قفل الغرفة',
            about: 'عرض المعلومات',
            emojiOn: 'فتح الرموز التعبيرية',
            chatClean: 'مسح الدردشة',
            chatSave: 'حفظ الدردشة',
            whiteboardUndo: 'تراجع السبورة',
            whiteboardRedo: 'إعادة السبورة',
            whiteboardClean: 'مسح السبورة',
            whiteboardSave: 'حفظ السبورة',
            settingsAudio: 'فتح إعدادات الصوت',
            settingsVideo: 'فتح إعدادات الفيديو',
            settingsRecording: 'فتح إعدادات التسجيل',
            settingsVideoEffects: 'فتح مؤثرات الفيديو',
            settingsVirtualBackground: 'فتح الخلفية الافتراضية',
            settingsLanguages: 'فتح إعدادات اللغة',
            settingsShortcuts: 'فتح الاختصارات',
            recognizeEnglish: 'التعرف على الإنجليزية',
            recognizeBangla: 'التعرف على البنغالية',
            recognizeItalian: 'التعرف على الإيطالية',
            recognizeSpanish: 'التعرف على الإسبانية',
            recognizeFrench: 'التعرف على الفرنسية',
            recognizeGerman: 'التعرف على الألمانية',
            recognizeJapanese: 'التعرف على اليابانية',
            recognizePortuguese: 'التعرف على البرتغالية',
            recognizeChinese: 'التعرف على الصينية',
            recognizeArabic: 'التعرف على العربية',
            stopRecognition: 'إيقاف التعرف الصوتي',
        },
    },
};

// Transcripts are lowercased before matching, so the commands must be lowercase too
Object.values(voiceCommandHandlers).forEach((handler) => {
    Object.keys(handler.commands).forEach((key) => {
        handler.commands[key] = handler.commands[key].toLowerCase();
    });
});

const voiceCommandsBtn = getId('voiceCommandsBtn');
const voiceCommandsIcon = getId('voiceCommandsIcon');

let voiceCaption;
let voiceCaptionTimer;

if (speechRecognition && voiceCommandsBtn) {
    voiceCommandsBtn.addEventListener('click', toggleVoiceCommands);
}

/**
 * Get the voice commands language from a recognition dialect code
 * @param {string} langCode e.g. en-US, cmn-Hans-CN
 * @returns {string|null} e.g. en, zh or null if not supported
 */
function getVoiceCommandLanguage(langCode = '') {
    const code = String(langCode).toLowerCase();
    if (/^(cmn|yue|zh)\b/.test(code)) return 'zh';
    const lang = code.split(/[-_]/)[0];
    return voiceCommandHandlers[lang] ? lang : null;
}

/**
 * Normalize a transcript for matching
 * @param {string} transcript
 * @returns {string}
 */
function normalizeVoiceTranscript(transcript) {
    return String(transcript || '')
        .trim()
        .toLowerCase()
        .replace(/[.,!?。、！？،]+$/u, '')
        .trim();
}

/**
 * Find the command matching the transcript
 * @param {string} transcript
 * @param {string} langCode recognition dialect code
 * @returns {string|null} command key
 */
function findVoiceCommand(transcript, langCode) {
    const lang = getVoiceCommandLanguage(langCode);
    if (!lang) return null;
    const phrase = normalizeVoiceTranscript(transcript);
    const commands = voiceCommandHandlers[lang].commands;
    return Object.keys(commands).find((key) => commands[key] === phrase) || null;
}

/**
 * Handle a recognized transcript
 * @param {string} transcript
 * @returns {boolean} true if it was a command (so it must not be used as caption)
 */
function handleVoiceCommandTranscript(transcript) {
    const command = findVoiceCommand(transcript, recognition.lang);
    showVoiceCaption(transcript, !!command);
    if (!command) return false;
    console.log('Voice command detected', { command, transcript });
    try {
        voiceCommandActions[command]?.();
    } catch (error) {
        console.error('Voice command error', { command, error });
    }
    return true;
}

/**
 * Click a button only if it is enabled in the UI
 * @param {HTMLElement} el
 */
function clickVoiceTarget(el) {
    if (!el || el.disabled || el.classList.contains('hidden') || el.style.display === 'none') return;
    el.click();
}

/**
 * Open a settings tab
 * @param {HTMLElement} tabButton
 */
function openVoiceSettingsTab(tabButton) {
    if (!tabButton || tabButton.style.display === 'none') return;
    if (!isMySettingsVisible) clickVoiceTarget(mySettingsBtn);
    if (isMySettingsVisible) tabButton.click();
}

/**
 * Confirm before leaving, a misheard phrase must not drop the call
 */
function confirmVoiceLeaveRoom() {
    Swal.fire({
        background: swBg,
        position: 'center',
        imageUrl: images.leave,
        title: 'Leave the meeting?',
        showDenyButton: true,
        confirmButtonText: 'Yes',
        denyButtonText: 'No',
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
    }).then((result) => {
        if (result.isConfirmed) leaveRoom();
    });
}

const voiceCommandActions = {
    shareRoom: () => clickVoiceTarget(shareRoomBtn),
    hideMe: () => !isHideMeActive && clickVoiceTarget(hideMeBtn),
    showMe: () => isHideMeActive && clickVoiceTarget(hideMeBtn),
    leaveRoom: () => confirmVoiceLeaveRoom(),
    audioOn: () => !myAudioStatus && clickVoiceTarget(audioBtn),
    audioOff: () => myAudioStatus && clickVoiceTarget(audioBtn),
    videoOn: () => !myVideoStatus && clickVoiceTarget(videoBtn),
    videoOff: () => myVideoStatus && clickVoiceTarget(videoBtn),
    screenOff: () => isScreenStreaming && clickVoiceTarget(screenShareBtn),
    chatOn: () => !isChatRoomVisible && clickVoiceTarget(chatRoomBtn),
    chatOff: () => isChatRoomVisible && getId('msgerClose')?.click(),
    pollOn: () => !pollIsOpen && clickVoiceTarget(pollBtn),
    pollOff: () => pollIsOpen && togglePoll(),
    breakoutRoomOn: () => !breakoutIsOpen && clickVoiceTarget(breakoutBtn),
    breakoutRoomOff: () => breakoutIsOpen && toggleBreakout(),
    editorOn: () => !editorIsOpen && clickVoiceTarget(editorBtn),
    editorOff: () => editorIsOpen && toggleEditor(),
    toggleTr: () => clickVoiceTarget(captionBtn),
    whiteboardOn: () => !wbIsOpen && clickVoiceTarget(whiteboardBtn),
    whiteboardOff: () => wbIsOpen && handleWhiteboardToggle(),
    recordingOn: () => !isStreamRecording && clickVoiceTarget(recordStreamBtn),
    recordingPause: () => isStreamRecording && !isStreamRecordingPaused && pauseRecording(),
    recordingResume: () => isStreamRecording && isStreamRecordingPaused && resumeRecording(),
    recordingOff: () => isStreamRecording && clickVoiceTarget(recordStreamBtn),
    settingsOn: () => !isMySettingsVisible && clickVoiceTarget(mySettingsBtn),
    settingsOff: () => isMySettingsVisible && hideShowMySettings(),
    participantsOn: () => !isParticipantsVisible && clickVoiceTarget(participantsBtn),
    participantsOff: () => isParticipantsVisible && clickVoiceTarget(participantsBtn),
    participantsVideoOff: () => clickVoiceTarget(hideEveryoneBtn),
    participantsAudioOff: () => clickVoiceTarget(muteEveryoneBtn),
    participantsKickOut: () => clickVoiceTarget(ejectEveryoneBtn),
    videoShareOn: () => clickVoiceTarget(msgerVideoUrlBtn),
    videoShareOff: () => {
        if (!isVideoUrlPlayerOpen) return;
        closeVideoUrlPlayer();
        emitVideoPlayer('close');
    },
    swapCamera: () => clickVoiceTarget(swapCameraBtn),
    raiseHand: () => !myHandStatus && clickVoiceTarget(myHandBtn),
    lowerHand: () => myHandStatus && clickVoiceTarget(myHandBtn),
    roomLock: () => !isRoomLocked && clickVoiceTarget(lockRoomBtn),
    roomUnlock: () => isRoomLocked && clickVoiceTarget(unlockRoomBtn),
    about: () => clickVoiceTarget(aboutBtn),
    emojiOn: () => roomEmojiPickerBtn.getAttribute('aria-pressed') !== 'true' && clickVoiceTarget(roomEmojiPickerBtn),
    chatClean: () => msgerClean.click(),
    chatSave: () => clickVoiceTarget(msgerSaveBtn),
    whiteboardUndo: () => wbIsOpen && whiteboardUndoBtn.click(),
    whiteboardRedo: () => wbIsOpen && whiteboardRedoBtn.click(),
    whiteboardClean: () => wbIsOpen && whiteboardCleanBtn.click(),
    whiteboardSave: () => wbIsOpen && whiteboardSaveBtn.click(),
    settingsAudio: () => openVoiceSettingsTab(tabAudioBtn),
    settingsVideo: () => openVoiceSettingsTab(tabVideoBtn),
    settingsRecording: () => openVoiceSettingsTab(tabRecordingBtn),
    settingsVideoEffects: () => openVoiceSettingsTab(tabVideoBtn),
    settingsVirtualBackground: () => openVoiceSettingsTab(tabVideoBtn),
    settingsLanguages: () => openVoiceSettingsTab(tabLanguagesBtn),
    settingsShortcuts: () => openVoiceSettingsTab(tabShortcutsBtn),
    recognizeEnglish: () => switchVoiceCommandLanguage('en'),
    recognizeBangla: () => switchVoiceCommandLanguage('bn'),
    recognizeItalian: () => switchVoiceCommandLanguage('it'),
    recognizeSpanish: () => switchVoiceCommandLanguage('es'),
    recognizeFrench: () => switchVoiceCommandLanguage('fr'),
    recognizeGerman: () => switchVoiceCommandLanguage('de'),
    recognizeJapanese: () => switchVoiceCommandLanguage('ja'),
    recognizePortuguese: () => switchVoiceCommandLanguage('pt'),
    recognizeChinese: () => switchVoiceCommandLanguage('zh'),
    recognizeArabic: () => switchVoiceCommandLanguage('ar'),
    stopRecognition: () => stopVoiceCommands(),
};

/**
 * Switch the recognition (and so the commands) language
 * @param {string} lang e.g. it
 */
function switchVoiceCommandLanguage(lang) {
    const handler = voiceCommandHandlers[lang];
    if (!handler || !setRecognitionDialect(handler.langCode)) return;
    restartRecognitionEngine();
    userLog('toast', `Voice commands language: ${recognitionLanguage.options[recognitionLanguage.selectedIndex].text}`);
}

/**
 * Start listening for voice commands
 */
function startVoiceCommands() {
    if (!speechRecognition || isVoiceCommandsActive) return;
    isVoiceCommandsActive = true;
    setVoiceCommandsButtonState(true);
    startRecognitionEngine();
    getVoiceCommandLanguage(recognitionDialect.value)
        ? userLog('toast', 'Voice commands started')
        : userLog('warning', 'Voice commands are not available for the selected recognition language', 'top-end');
}

/**
 * Stop listening for voice commands
 */
function stopVoiceCommands() {
    if (!isVoiceCommandsActive) return;
    resetVoiceCommands();
    stopRecognitionEngine();
    userLog('toast', 'Voice commands stopped');
}

/**
 * Reset the voice commands state and UI (the engine is managed by the caller)
 */
function resetVoiceCommands() {
    isVoiceCommandsActive = false;
    setVoiceCommandsButtonState(false);
    hideVoiceCaption();
}

/**
 * Toggle voice commands
 */
function toggleVoiceCommands() {
    if (isMobileDevice && settingsExtraMenu) {
        settingsExtraMenu.classList.remove('show');
        settingsExtraMenu.classList.add('hidden');
    }
    isVoiceCommandsActive ? stopVoiceCommands() : startVoiceCommands();
}

/**
 * Update the voice commands button
 * @param {boolean} active
 */
function setVoiceCommandsButtonState(active) {
    if (!voiceCommandsBtn || !voiceCommandsIcon) return;
    voiceCommandsIcon.classList.toggle('fa-microphone', active);
    voiceCommandsIcon.classList.toggle('fa-microphone-slash', !active);
    setColor(voiceCommandsIcon, active ? 'lime' : '');
    voiceCommandsBtn.setAttribute('aria-pressed', String(active));
}

/**
 * Get or create the live voice caption banner
 * @returns {HTMLElement}
 */
function getVoiceCaption() {
    if (voiceCaption) return voiceCaption;
    voiceCaption = document.createElement('div');
    voiceCaption.className = 'voice-caption';
    voiceCaption.setAttribute('role', 'status');
    voiceCaption.setAttribute('aria-live', 'polite');

    const dot = document.createElement('span');
    dot.className = 'voice-caption-dot';

    const label = document.createElement('span');
    label.className = 'voice-caption-label';
    label.textContent = window.i18n?.t('You say', 'labels') || 'You say';

    const text = document.createElement('span');
    text.className = 'voice-caption-text';

    voiceCaption.append(dot, label, text);
    document.body.appendChild(voiceCaption);
    return voiceCaption;
}

/**
 * Show the heard phrase, the border turns green when it is a known command
 * @param {string} transcript
 * @param {boolean} isCommand
 */
function showVoiceCaption(transcript, isCommand) {
    const caption = getVoiceCaption();
    caption.querySelector('.voice-caption-text').textContent = `“${transcript.trim()}”`;
    caption.classList.toggle('is-matched', isCommand);
    caption.classList.add('is-visible');
    clearTimeout(voiceCaptionTimer);
    voiceCaptionTimer = setTimeout(hideVoiceCaption, 2800);
}

/**
 * Hide the live voice caption banner
 */
function hideVoiceCaption() {
    clearTimeout(voiceCaptionTimer);
    voiceCaption?.classList.remove('is-visible');
}
