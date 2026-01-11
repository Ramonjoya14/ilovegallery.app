import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// --- TRANSLATIONS ---
const translations = {
    es: {
        // General
        back: 'Volver',
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        active: 'Activo',
        finished: 'Finalizado',

        // Profile
        profile_title: 'Perfil',
        profile_info: 'Información Personal',
        security: 'Seguridad y Contraseña',
        preferences: 'PREFERENCIAS',
        notifications: 'Notificaciones',
        save_to_gallery: 'Guardar en carrete',
        auto: 'Automáticamente',
        dark_mode: 'Modo Oscuro',
        language: 'Idioma',
        logout: 'Cerrar Sesión',
        stats_events: 'Eventos',
        stats_photos: 'Fotos',
        stats_rolls: 'Carretes',

        // Create
        new_event: 'Nuevo Evento',
        create: 'Crear',
        event_name: 'Nombre del evento',
        description: 'Descripción',
        location: 'Ubicación',
        template: 'Plantilla',
        start_date: 'Cuándo empieza',
        pin_protect: 'Contraseña del evento',
        pin_sub: 'Requiere un PIN para entrar',
        pin_label: 'Código PIN (4 dígitos)',
        error_event_name_required: 'Por favor ingresa un nombre para el evento',
        select_date: 'Seleccionar fecha',

        // Gallery
        my_rolls: 'Mis Rollos',
        all: 'Todos',
        in_process: 'En Proceso',
        archived: 'Archivados',
        favorites: 'Favoritos',

        // Empty States
        empty_events: 'No hay eventos en curso',
        empty_archived: 'No tienes eventos archivados',
        empty_favorites: 'No hay eventos en favoritos',

        // Stats Page
        stats_title: 'Estadísticas',
        stats_summary_title: 'Tu Resumen',
        stats_summary_subtitle: 'Así va tu colección de recuerdos.',
        stats_monthly_activity: 'Actividad Mensual',
        stats_best_memories: 'Mejores Recuerdos',
        stats_best_memories_subtitle: 'Basado en tus fotos más recientes.',
        stats_completed: 'COMPLETADOS',
        stats_shared: 'COMPARTIDOS',
        stats_week: 'Sem',
        stats_your_level: 'TU NIVEL',
        view_all: 'Ver todo',

        // Time Ranges
        time_all: 'Todo el tiempo',
        time_year: 'Este año',
        time_month: 'Este mes',

        // Generic
        loading: 'Cargando',
        private_content: 'Contenido Privado',
        private: 'PRIVADO',

        // Personal Info
        full_name: 'Nombre completo',
        username: 'Nombre de usuario',
        email: 'Correo electrónico',
        phone: 'Número de teléfono',
        change_photo: 'Cambiar foto',
        save_changes: 'Guardar cambios',
        success_update: 'Información actualizada correctamente',
        success: 'Éxito',


        // Event Details
        date_label: 'FECHA',
        time_label: 'HORA',
        template_label: 'PLANTILLA',
        pending_roll: 'Rollo Pendiente',
        pending_subtitle: 'Tienes',
        pending_subtitle_2: 'fotos esperando revelado',
        reveal_now: 'Revelar Ahora',
        revealed_roll: 'Rollo Revelado',
        wait_time_instant: 'TIEMPO DE ESPERA: INSTANTÁNEO',
        gallery_title: 'Galería',
        capture_more: 'Captura más momentos',
        empty_roll: 'Aún no hay fotos en este rollo.',
        nav_back: 'Volver',

        // Alerts & Actions
        alert_error: 'Error',
        alert_success: '¡Éxito!',
        alert_warning: 'Atención',
        alert_info: 'Información',
        confirm_reveal: '¿Estás seguro de que quieres revelar el rollo ahora? No podrás tomar más fotos en este evento.',
        confirm_delete_photo: '¿Estás segura de que quieres eliminar esta foto?',
        confirm_delete_event: '¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.',
        action_reveal: 'Revelar',
        action_delete: 'Eliminar',
        action_share: 'Compartir',
        action_save: 'Guardar',
        action_details: 'Detalles',
        action_like: 'Me gusta',
        action_unlike: 'Ya no me gusta',
        notif_summary_title: 'Resumen de Actividad',
        notif_summary_msg: '¡Qué mes! Has capturado {photos} fotos, revelado {revealed} recuerdos y creado {events} eventos.',
        notif_revealed_title: '¡Carrete Revelado!',
        notif_revealed_msg: 'El carrete "{name}" se ha revelado automáticamente tras 5 horas.',
        notif_download_title: 'Descarga Completada',
        notif_download_msg: '¡{type} guardado correctamente en tu dispositivo!',
        photo_viewer_saved_title: '¡Guardado!',
        photo_viewer_saved_msg: '{type} guardado en tu galería.',
        photo_viewer_share_error: 'Compartir no está disponible en este dispositivo',
        photo_viewer_save_warning: 'No pudimos guardar directamente en la galería. Abriremos el menú de compartir para que puedas guardarlo.',
        photo_viewer_details_taken_by: 'Tomada por',
        photo_viewer_details_date: 'Fecha',
        type_photo: 'Foto',
        type_video: 'Video',
        action_archive: 'Archivar Evento',
        action_unarchive: 'Desarchivar Evento',
        action_favorite: 'Agregar a Favoritos',
        action_unfavorite: 'Quitar de Favoritos',
        action_make_private: 'Hacer Privado',
        action_make_public: 'Hacer Público',
        action_remove_pin: 'Remover PIN',
        enter_pin_prompt: 'Crea un PIN de 4 dígitos para este evento',
        remove_pin_confirm: '¿Seguro que quieres hacer este evento público? Ya no requerirá contraseña.',

        // Errors
        error_login_photo: 'Debes estar conectado para tomar fotos.',
        error_event_finished: 'Este evento ya no acepta más fotos.',
        error_limit_reached: 'Se ha alcanzado el límite de fotos para este evento.',

        // Themes
        theme_light: 'Claro',
        theme_dark: 'Oscuro',

        // Misc
        event_not_found: 'Evento no encontrado',
        coming_soon: 'Próximamente',
        home_title: 'Inicio',
        guest: 'Invitado',
        visitor: 'Visitante',
        account: 'CUENTA',
        user_placeholder: 'Usuario',
        today: 'Hoy',

        // Home
        home_greeting: 'Hola, {name} 👋',
        home_loading: 'Cargando...',
        home_status_live: 'EN VIVO',
        home_status_revealed: 'REVELADO',
        home_organized_by: 'Organizado por',
        home_current_roll: 'ROLLO ACTUAL',
        home_expires_in: 'Expira en',
        home_finished: 'Finalizado',
        home_photos_revealed: 'Fotos Reveladas',
        home_activity: 'Tu Actividad',
        home_completed_rolls: 'Carretes completados',
        home_shared_events: 'Eventos compartidos',
        home_featured: 'Momentos Destacados',
        home_empty_featured: 'Pronto verás tus fotos aquí 📸',
        home_premium_title: 'Vive el momento, nosotros lo capturamos.',
        home_premium_subtitle: 'Olvídate de editar. Disfruta de la magia de la fotografía analógica en tu móvil.',
        save_roll: 'Guardar Carrete',

        // Notifications

        // Notifications
        notifications_title: 'Notificaciones',
        notifications_empty_title: 'Todo al día',
        notifications_empty_subtitle: 'No tienes notificaciones nuevas por ahora.',
        time_unit_m: 'm',
        time_unit_h: 'h',
        time_unit_d: 'd',

        // Security
        security_title: 'Seguridad',
        security_account_title: 'Seguridad de la cuenta',
        security_subtitle: 'Gestiona tu contraseña y configura métodos de verificación adicionales para proteger tus eventos.',
        password_section: 'CONTRASEÑA',
        current_password: 'CONTRASEÑA ACTUAL',
        new_password: 'NUEVA CONTRASEÑA',
        confirm_password: 'CONFIRMAR CONTRASEÑA',
        placeholder_password: '********',
        placeholder_new_password: 'Mínimo 8 caracteres',
        placeholder_confirm_password: 'Repite la nueva contraseña',
        update_password_btn: 'Actualizar Contraseña',
        forgot_password_btn: '¿Olvidaste tu contraseña actual?',
        password_success: 'Contraseña actualizada correctamente',
        password_match_error: 'Las contraseñas no coinciden',
        password_length_error: 'La nueva contraseña debe tener al menos 8 caracteres',
        password_fill_error: 'Por favor completa todos los campos',

        // Personal Info Extras
        placeholder_name: 'Tu nombre completo',
        placeholder_username: 'usuario',
        error_username_taken: 'Nombre de usuario no disponible',
        error_username_invalid: 'No se permiten espacios ni caracteres especiales',
        error_username_taken_alert: 'Ese nombre de usuario ya está en uso.',
        error_username_invalid_alert: 'El nombre de usuario no es válido (solo letras, números, puntos y guiones, sin espacios).',
        error_save_generic: 'No se pudieron guardar los cambios.',
        last_update: 'Última actualización: {time}',
        time_2_days: 'hace 2 días',

        // Welcome
        welcome_title: '¡Bienvenidos!',
        welcome_subtitle: 'a iLoveGallery',

        // Support
        support_section: 'SOPORTE',
        privacy_policy: 'Política de Privacidad',
        about_us: 'Acerca de',
        delete_account: 'Eliminar Cuenta',
        delete_account_confirm: '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer y perderás todos tus carretes y fotos.',
        delete_account_final_confirm: 'Último aviso: Se borrarán TODOS tus datos permanentemente (carretes, fotos, perfil). ¿Confirmar eliminación?',
        delete_account_success: 'Tu cuenta y todos tus datos han sido eliminados correctamente.',
        reauth_required: 'Por seguridad, debes confirmar tu contraseña para realizar esta acción.',
        reauth_title: 'Confirmar Identidad',
        reauth_placeholder: 'Tu contraseña actual',
        reauth_btn: 'Confirmar y Eliminar',
        reauth_error: 'Contraseña incorrecta. Inténtalo de nuevo.',

        // Auth
        login_title: 'Iniciar Sesión',
        login_subtitle: 'Bienvenido de nuevo a la fiesta',
        label_email_username: 'Email o Usuario',
        placeholder_email: 'ejemplo@correo.com',
        label_password: 'Contraseña',
        label_confirm_password: 'Confirmar contraseña',
        placeholder_password_rules: 'Mín. 8 caracteres y un número',
        unverified: 'No verificado',
        verification_email_sent: 'Enlace de verificación enviado a tu correo.',
        verify_email_title: 'Verifica tu correo',
        verify_email_subtitle: 'Pulsa aquí para recibir el enlace',
        forgot_password_link: '¿Olvidaste tu contraseña?',
        btn_login: 'Entrar',
        btn_guest: 'Continuar como Invitado',
        register_prompt: '¿No tienes cuenta? ',
        register_link: 'Regístrate',
        error_email_required: 'Por favor, ingresa tu correo o usuario',
        error_password_required: 'Por favor, ingresa tu contraseña',
        error_user_not_found: 'Nombre de usuario no encontrado',
        error_invalid_email_firebase: 'Correo electrónico no válido',
        error_email_not_registered: 'Correo electrónico no registrado',
        error_wrong_password: 'Contraseña incorrecta',
        error_invalid_credentials: 'Credenciales incorrectas',
        error_login_generic: 'Error al iniciar sesión',
        forgot_pass_title: '¿Olvidaste tu contraseña?',
        forgot_pass_subtitle: 'No te preocupes. Ingresa tu correo y te enviaremos un enlace para restablecerla.',
        forgot_pass_sent_title: '¡Correo enviado!',
        forgot_pass_sent_subtitle: 'Hemos enviado instrucciones de recuperación a {email}',
        label_email: 'Correo electrónico',
        btn_send_instructions: 'Enviar Instrucciones',
        btn_back_to_login: 'Volver al Login',
        cancel_link: 'Cancelar',
        try_again_link: '¿No recibiste nada? Intenta de nuevo',
        error_input_email_forgot: 'Por favor ingresa tu correo electrónico',
        error_send_email: 'No se pudo enviar el correo de recuperación.',
        error_user_not_found_forgot: 'No existe ninguna cuenta asociada a este correo.',

        register_title: 'Crear Cuenta',
        register_title_rev: 'Empieza a revelar',
        register_title_memories: 'tus recuerdos.',
        register_subtitle: 'Únete a iLoveGallery y captura momentos',
        register_subtitle_new: 'Crea tu cuenta para capturar momentos únicos.',
        label_full_name: 'Nombre Completo',
        placeholder_full_name: 'Tu nombre completo',
        label_username_auth: 'Usuario',
        placeholder_username_auth: 'usuario',
        btn_register: 'Registrarse',
        btn_create_account: 'Crear Cuenta',
        login_prompt: '¿Ya tienes cuenta? ',
        login_prompt_already: '¿Ya tienes una cuenta? ',
        login_link: 'Inicia Sesión',
        error_name_required: 'Por favor, ingresa tu nombre',
        error_username_required: 'Por favor, ingresa un nombre de usuario',
        error_email_invalid: 'Por favor, ingresa un correo válido',
        error_pass_match: 'Las contraseñas no coinciden',
        error_pass_length: 'La contraseña debe tener al menos 8 caracteres',
        error_pass_number: 'Debe incluir al menos un número',
        error_email_in_use: 'Este correo ya está registrado',
        error_weak_password: 'La contraseña es muy débil',
        register_success: '¡Cuenta Creada!',
        register_success_verify: 'Te hemos enviado un correo de verificación. Por favor, revisa tu bandeja de entrada.',
        error_input_name: 'Ingresa tu nombre completo',
        error_input_email: 'Ingresa tu correo',
        error_input_password: 'Ingresa una contraseña',
        error_register_generic: 'Error al crear cuenta',

        // Onboarding
        onb_skip: 'Omitir',
        onb_start: 'Comenzar',
        onb_next: 'Siguiente',
        onb_slide1_title: 'Crea tu Evento',
        onb_slide1_desc: 'Inicia una cámara desechable digital para tu fiesta, boda o reunión.',
        onb_slide2_title: 'Comparte con Amigos',
        onb_slide2_desc: 'Invita a tus amigos con un código PIN. Todos toman fotos en el mismo carrete.',
        onb_slide3_title: 'Captura el Momento',
        onb_slide3_desc: 'Las fotos son sorpresa. Nadie puede verlas hasta que se revela el rollo.',
        onb_slide4_title: 'Revela la Magia',
        onb_slide4_desc: 'Al finalizar, todos reciben las fotos reveladas para revivir los recuerdos.',

        // Create Extras
        placeholder_event_name: 'Ej. Boda de Ana y Luis',
        placeholder_description: 'Cuenta un poco sobre qué fotos tomarán...',
        placeholder_location: 'Ej. Rooftop Bar, CDMX',
        add_cover: 'Añadir portada',
        choose_template: 'Elegir Plantilla',
        create_camera: 'Crear Evento',
        creating: 'Creando...',
        success_event_created_title: '¡Evento Creado!',
        success_event_created_subtitle: 'Tu cámara desechable está lista.',
        success_event_created_msg: 'Evento creado correctamente.',
        error_create_event: 'No se pudo crear el evento. Inténtalo de nuevo.',
        error_pin_required: 'Por favor ingresa un PIN de 4 dígitos si deseas proteger el evento',
        select_source: 'Seleccionar origen',
        camera: 'Cámara',
        gallery: 'Galería',
        permission_denied_camera_msg: 'Necesitamos permiso para acceder a tu cámara.',

        // Additional Create keys
        lang_code: 'es-ES',
        shots_available: 'Disparos Disponibles',
        invite_friends: 'Invitar amigos al evento',
        open_camera: 'Abrir Cámara',
        camera_label: 'CÁMARA',
        back_to_home: 'Volver al inicio',

        template_boda: 'Boda',
        template_cumple: 'Cumpleaños',
        template_fiesta: 'Fiesta',
        template_corporativo: 'Corporativo',
        template_familiar: 'Familiar',
        template_personal: 'Personalizado',

        // Event Details Extras
        roll_complete_title: 'Rollo Completo',
        roll_complete_msg: 'Ya has completado todas las fotos de este rollo. Para subir más, primero elimina alguna foto existente.',
        permission_denied_title: 'Permiso denegado',
        permission_denied_gallery_msg: 'Necesitamos permiso para acceder a tu galería.',
        error_open_gallery: 'No se pudo abrir la galería.',
        success_reveal_msg: '¡Rollo Revelado! Ahora todos pueden ver las fotos.',
        error_reveal_roll: 'No se pudo revelar el rollo.',
        error_delete_photo: 'No se pudo eliminar la foto.',
        error_delete_event: 'No se pudo eliminar el evento.',
        event_private_title: 'Evento Privado',
        event_private_subtitle: 'Este evento requiere un PIN de acceso.',
        enter_pin_btn: 'Introducir PIN',
        back_btn_bold: 'Volver atrás',
        default_description: '¡No olviden tomar fotos antes de que se acabe el rollo! Tenemos 24 exposiciones para capturar los mejores momentos.',
        location_not_specified: 'Ubicación no especificada',
        pin_error: 'PIN incorrecto. Inténtalo de nuevo.',
        join_event_title: 'Unirse a Evento',
        join_event_subtitle: 'Ingresa el código de 6 dígitos para clonar el carrete.',
        join_btn: 'Unirse',
        photo_saved: 'Foto Guardada',
        see_on_reveal: 'Se verá al revelar',

        // Levels
        level_novato: 'Novato',
        level_aficionado: 'Aficionado',
        level_avanzado: 'Avanzado',
        level_profesional: 'Profesional',
        level_desc_master: '¡Eres un maestro de los recuerdos!',
        level_desc_pro: '{count} carretes para ser Profesional',
        level_desc_advanced: '{count} carretes para nivel Avanzado',
        level_desc_hobbyist_empty: '¡Completa tu primer carrete para subir!',
        level_desc_hobbyist: '{count} eventos para ser Aficionado',

        // Privacy Policy Content
        privacy_title: 'Política de Privacidad',
        privacy_last_update: 'Última actualización: 1 de Enero, 2026',
        privacy_intro: 'En iLoveGallery, valoramos tu privacidad. Esta política describe cómo manejamos tus fotos y datos personales.',
        privacy_item_1_title: '1. Fotos y Videos:',
        privacy_item_1_desc: 'Todo el contenido que subes a un evento es compartido únicamente con los participantes de ese evento que posean el código de acceso.',
        privacy_item_2_title: '2. Datos del Usuario:',
        privacy_item_2_desc: 'Recopilamos tu correo electrónico y nombre para gestionar tu cuenta y eventos. No vendemos tus datos a terceros.',
        privacy_item_3_title: '3. Eliminación:',
        privacy_item_3_desc: 'Puedes eliminar tu cuenta y todos tus datos asociados en cualquier momento desde la configuración de tu perfil.',
        privacy_item_4_title: '4. Seguridad:',
        privacy_item_4_desc: 'Utilizamos Firebase de Google para garantizar que tus datos estén protegidos con estándares de seguridad de nivel empresarial.',

        // About Content
        about_version: 'Versión {version}',
        about_desc: 'iLoveGallery es una experiencia de cámara desechable social diseñada para capturar momentos auténticos en tus eventos especiales.\n\nCrea un evento, invita a tus amigos y disfruten capturando fotos que solo se revelarán cuando el rollo esté lleno o el evento termine.',
        about_footer: 'Hecho con ❤️ para momentos involvidables.',
    },
    en: {
        // General
        back: 'Back',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        active: 'Active',
        finished: 'Finished',

        // Profile
        profile_title: 'Profile',
        profile_info: 'Personal Information',
        security: 'Security & Password',
        preferences: 'PREFERENCES',
        notifications: 'Notifications',
        save_to_gallery: 'Save to Gallery',
        auto: 'Automatically',
        dark_mode: 'Dark Mode',
        language: 'Language',
        logout: 'Log Out',
        stats_events: 'Events',
        stats_photos: 'Photos',
        stats_rolls: 'Rolls',

        // Personal Info
        full_name: 'Full Name',
        username: 'Username',
        email: 'Email',
        phone: 'Phone Number',
        change_photo: 'Change Photo',
        save_changes: 'Save Changes',
        success_update: 'Information updated successfully',
        success: 'Success',


        // Event Details
        date_label: 'DATE',
        time_label: 'TIME',
        template_label: 'TEMPLATE',
        pending_roll: 'Pending Roll',
        pending_subtitle: 'You have',
        pending_subtitle_2: 'photos waiting to be revealed',
        reveal_now: 'Reveal Now',
        revealed_roll: 'Roll Revealed',
        wait_time_instant: 'WAIT TIME: INSTANT',
        gallery_title: 'Gallery',
        capture_more: 'Capture more moments',
        empty_roll: 'No photos in this roll yet.',
        nav_back: 'Go Back',

        // Alerts & Actions
        alert_error: 'Error',
        alert_success: 'Success!',
        alert_warning: 'Warning',
        alert_info: 'Information',
        confirm_reveal: 'Are you sure you want to reveal the roll now? You won\'t be able to take more photos in this event.',
        confirm_delete_photo: 'Are you sure you want to delete this photo?',
        confirm_delete_event: 'Are you sure you want to delete this event? This action cannot be undone.',
        action_reveal: 'Reveal',
        action_delete: 'Delete',
        action_share: 'Share',
        action_save: 'Save',
        action_details: 'Details',
        action_like: 'Like',
        action_unlike: 'Unlike',
        notif_summary_title: 'Activity Summary',
        notif_summary_msg: 'What a month! You captured {photos} photos, revealed {revealed} memories and created {events} events.',
        notif_revealed_title: 'Roll Revealed!',
        notif_revealed_msg: 'The roll "{name}" was automatically revealed after 5 hours.',
        notif_download_title: 'Download Completed',
        notif_download_msg: '{type} saved successfully to your device!',
        photo_viewer_saved_title: 'Saved!',
        photo_viewer_saved_msg: '{type} saved to your gallery.',
        photo_viewer_share_error: 'Sharing is not available on this device',
        photo_viewer_save_warning: 'We could not save directly to the gallery. We will open the share menu so you can save it.',
        photo_viewer_details_taken_by: 'Taken by',
        photo_viewer_details_date: 'Date',
        type_photo: 'Photo',
        type_video: 'Video',
        action_archive: 'Archive Event',
        action_unarchive: 'Unarchive Event',
        action_favorite: 'Add to Favorites',
        action_unfavorite: 'Remove from Favorites',
        action_make_private: 'Make Private',
        action_make_public: 'Make Public',
        action_remove_pin: 'Remove PIN',
        enter_pin_prompt: 'Create a 4-digit PIN for this event',
        remove_pin_confirm: 'Are you sure you want to make this event public? It will no longer require a password.',

        // Errors
        error_login_photo: 'You must be logged in to take photos.',
        error_event_finished: 'This event is no longer accepting photos.',
        error_limit_reached: 'Photo limit reached for this event.',

        // Themes
        theme_light: 'Light',
        theme_dark: 'Dark',

        // Misc
        event_not_found: 'Event not found',
        coming_soon: 'Coming Soon',

        // Create
        new_event: 'New Event',
        create: 'Create',
        event_name: 'Event Name',
        description: 'Description',
        location: 'Location',
        template: 'Template',
        start_date: 'Starts on',
        pin_protect: 'Event Password',
        pin_sub: 'Requires a PIN to enter',
        pin_label: 'PIN Code (4 digits)',
        error_event_name_required: 'Please enter an event name',
        select_date: 'Select Date',

        // Gallery
        my_rolls: 'My Rolls',
        all: 'All',
        in_process: 'In Process',
        archived: 'Archived',
        favorites: 'Favorites',

        // Empty States
        empty_events: 'No events in progress',
        empty_archived: 'No archived events',
        empty_favorites: 'No favorite events',

        // Stats Page
        stats_title: 'Statistics',
        stats_summary_title: 'Your Summary',
        stats_summary_subtitle: 'How your memory collection is going.',
        stats_monthly_activity: 'Monthly Activity',
        stats_best_memories: 'Best Memories',
        stats_best_memories_subtitle: 'Based on your recent photos.',
        stats_completed: 'COMPLETED',
        stats_shared: 'SHARED',
        stats_week: 'Week',
        stats_your_level: 'YOUR LEVEL',
        view_all: 'View all',

        // Time Ranges
        time_all: 'All time',
        time_year: 'This year',
        time_month: 'This month',

        // Generic
        loading: 'Loading',
        private_content: 'Private Content',
        private: 'PRIVATE',
        home_title: 'Home',
        guest: 'Guest',
        visitor: 'Visitor',
        account: 'ACCOUNT',
        user_placeholder: 'User',
        today: 'Today',

        // Home
        home_greeting: 'Hello, {name} 👋',
        home_loading: 'Loading...',
        home_status_live: 'LIVE',
        home_status_revealed: 'REVEALED',
        home_organized_by: 'Organized by',
        home_current_roll: 'CURRENT ROLL',
        home_expires_in: 'Expires in',
        home_finished: 'Finished',
        home_photos_revealed: 'Photos Revealed',
        home_activity: 'Your Activity',
        home_completed_rolls: 'Completed Rolls',
        home_shared_events: 'Shared Events',
        home_featured: 'Featured Moments',
        home_empty_featured: 'You’ll see your photos here soon 📸',
        home_premium_title: 'Live the moment, we capture it.',
        home_premium_subtitle: 'Forget editing. Enjoy the magic of analog photography on your mobile.',
        save_roll: 'Save Roll',

        // Notifications

        // Notifications
        notifications_title: 'Notifications',
        notifications_empty_title: 'All caught up',
        notifications_empty_subtitle: 'You have no new notifications for now.',
        time_unit_m: 'm',
        time_unit_h: 'h',
        time_unit_d: 'd',

        // Security
        security_title: 'Security',
        security_account_title: 'Account Security',
        security_subtitle: 'Manage your password and configure additional verification methods to protect your events.',
        password_section: 'PASSWORD',
        current_password: 'CURRENT PASSWORD',
        new_password: 'NEW PASSWORD',
        confirm_password: 'CONFIRM PASSWORD',
        placeholder_password: '********',
        placeholder_new_password: 'Minimum 8 characters',
        placeholder_confirm_password: 'Repeat the new password',
        update_password_btn: 'Update Password',
        forgot_password_btn: 'Forgot your current password?',
        password_success: 'Password updated successfully',
        password_match_error: 'Passwords do not match',
        password_length_error: 'New password must be at least 8 characters long',
        password_fill_error: 'Please fill in all fields',

        // Personal Info Extras
        placeholder_name: 'Your full name',
        placeholder_username: 'username',
        error_username_taken: 'Username not available',
        error_username_invalid: 'Spaces or special characters not allowed',
        error_username_taken_alert: 'That username is already in use.',
        error_username_invalid_alert: 'The username is invalid (only letters, numbers, dots, and hyphens allowed, no spaces).',
        error_save_generic: 'Changes could not be saved.',
        last_update: 'Last update: {time}',
        time_2_days: '2 days ago',

        // Welcome
        welcome_title: 'Welcome!',
        welcome_subtitle: 'to iLoveGallery',

        // Support
        support_section: 'SUPPORT',
        privacy_policy: 'Privacy Policy',
        about_us: 'About',
        delete_account: 'Delete Account',
        delete_account_confirm: 'Are you sure you want to delete your account? This action cannot be undone and you will lose all your rolls and photos.',
        delete_account_final_confirm: 'Final warning: ALL your data will be permanently deleted (rolls, photos, profile). Confirm deletion?',
        delete_account_success: 'Your account and all your data have been deleted successfully.',
        reauth_required: 'For security, you must confirm your password to perform this action.',
        reauth_title: 'Confirm Identity',
        reauth_placeholder: 'Your current password',
        reauth_btn: 'Confirm and Delete',
        reauth_error: 'Incorrect password. Please try again.',

        // Auth
        login_title: 'Login',
        login_subtitle: 'Welcome back to the party',
        label_email_username: 'Email or Username',
        placeholder_email: 'example@mail.com',
        label_password: 'Password',
        label_confirm_password: 'Confirm Password',
        placeholder_password_rules: 'Min. 8 chars and a number',
        unverified: 'Unverified',
        verification_email_sent: 'Verification link sent to your email.',
        verify_email_title: 'Verify your email',
        verify_email_subtitle: 'Tap here to receive the link',
        forgot_password_link: 'Forgot your password?',
        btn_login: 'Login',
        btn_guest: 'Continue as Guest',
        register_prompt: 'Don\'t have an account? ',
        register_link: 'Sign Up',
        error_email_required: 'Please enter your email or username',
        error_password_required: 'Please enter your password',
        error_user_not_found: 'Username not found',
        error_invalid_email_firebase: 'Invalid email address',
        error_email_not_registered: 'Email not registered',
        error_wrong_password: 'Incorrect password',
        error_invalid_credentials: 'Invalid credentials',
        error_login_generic: 'Error during login',
        forgot_pass_title: 'Forgot password?',
        forgot_pass_subtitle: 'Don\'t worry. Enter your email and we\'ll send you a link to reset it.',
        forgot_pass_sent_title: 'Email sent!',
        forgot_pass_sent_subtitle: 'We have sent recovery instructions to {email}',
        label_email: 'Email',
        btn_send_instructions: 'Send Instructions',
        btn_back_to_login: 'Back to Login',
        cancel_link: 'Cancel',
        try_again_link: 'Didn\'t receive anything? Try again',
        error_input_email_forgot: 'Please enter your email address',
        error_send_email: 'Could not send recovery email.',
        error_user_not_found_forgot: 'No account associated with this email exists.',

        register_title: 'Create Account',
        register_title_rev: 'Start revealing',
        register_title_memories: 'your memories.',
        register_subtitle: 'Join iLoveGallery and capture moments',
        register_subtitle_new: 'Create your account to capture unique moments.',
        label_full_name: 'Full Name',
        placeholder_full_name: 'Your full name',
        label_username_auth: 'Username',
        placeholder_username_auth: 'username',
        btn_register: 'Sign Up',
        btn_create_account: 'Create Account',
        login_prompt: 'Already have an account? ',
        login_prompt_already: 'Already have an account? ',
        login_link: 'Login',
        error_name_required: 'Please enter your name',
        error_username_required: 'Please enter a username',
        error_email_invalid: 'Please enter a valid email',
        error_pass_match: 'Passwords do not match',
        error_pass_length: 'Password must be at least 8 characters',
        error_pass_number: 'Must include at least one number',
        error_email_in_use: 'Email already in use',
        error_weak_password: 'The password is too weak',
        register_success: 'Account Created!',
        register_success_verify: 'We have sent you a verification email. Please check your inbox.',
        error_input_name: 'Enter your full name',
        error_input_email: 'Enter your email',
        error_input_password: 'Enter a password',
        error_register_generic: 'Error creating account',

        // Onboarding
        onb_skip: 'Skip',
        onb_start: 'Get Started',
        onb_next: 'Next',
        onb_slide1_title: 'Create your Event',
        onb_slide1_desc: 'Start a digital disposable camera for your party, wedding, or gathering.',
        onb_slide2_title: 'Share with Friends',
        onb_slide2_desc: 'Invite friends with a PIN code. Everyone takes photos on the same roll.',
        onb_slide3_title: 'Capture the Moment',
        onb_slide3_desc: 'Photos are a surprise. No one can see them until the roll is revealed.',
        onb_slide4_title: 'Reveal the Magic',
        onb_slide4_desc: 'At the end, everyone gets the revealed photos to relive the memories.',

        // Create Extras
        placeholder_event_name: 'e.g. Wedding of Ana & Luis',
        placeholder_description: 'Tell us a bit about what photos will be taken...',
        placeholder_location: 'e.g. Rooftop Bar, NY',
        add_cover: 'Add cover',
        choose_template: 'Choose Template',
        create_camera: 'Create Camera',
        creating: 'Creating...',
        success_event_created_title: 'Event Created!',
        success_event_created_subtitle: 'Your disposable camera is ready.',
        success_event_created_msg: 'Event created successfully.',
        error_create_event: 'Could not create the event. Try again.',
        error_pin_required: 'Please enter a 4-digit PIN to protect the event',
        select_source: 'Select Source',
        camera: 'Camera',
        gallery: 'Gallery',
        permission_denied_camera_msg: 'We need permission to access your camera.',

        // Additional Create keys
        lang_code: 'en-US',
        shots_available: 'Shots Available',
        invite_friends: 'Invite friends to the event',
        open_camera: 'Open Camera',
        camera_label: 'CAMERA',
        back_to_home: 'Back to home',

        template_boda: 'Wedding',
        template_cumple: 'Birthday',
        template_fiesta: 'Party',
        template_corporativo: 'Corporate',
        template_familiar: 'Family',
        template_personal: 'Custom',

        // Event Details Extras
        roll_complete_title: 'Roll Complete',
        roll_complete_msg: 'You have completed all photos for this roll. To upload more, please delete an existing photo first.',
        permission_denied_title: 'Permission Denied',
        permission_denied_gallery_msg: 'We need permission to access your gallery.',
        error_open_gallery: 'Could not open the gallery.',
        success_reveal_msg: 'Roll Revealed! Everyone can now see the photos.',
        error_reveal_roll: 'Could not reveal the roll.',
        error_delete_photo: 'Could not delete the photo.',
        error_delete_event: 'Could not delete the event.',
        event_private_title: 'Private Event',
        event_private_subtitle: 'This event requires an access PIN.',
        enter_pin_btn: 'Enter PIN',
        back_btn_bold: 'Go back',
        default_description: 'Don\'t forget to take photos before the roll ends! We have 24 exposures to capture the best moments.',
        location_not_specified: 'Location not specified',
        pin_error: 'Incorrect PIN. Try again.',
        join_event_title: 'Join Event',
        join_event_subtitle: 'Enter the 6-digit code to clone the roll.',
        join_btn: 'Join',
        photo_saved: 'Photo Saved',
        see_on_reveal: 'Will be seen after reveal',

        // Levels
        level_novato: 'Novice',
        level_aficionado: 'Hobbyist',
        level_avanzado: 'Advanced',
        level_profesional: 'Professional',
        level_desc_master: 'You are a master of memories!',
        level_desc_pro: '{count} rolls to become Professional',
        level_desc_advanced: '{count} rolls for Advanced level',
        level_desc_hobbyist_empty: 'Complete your first roll to level up!',
        level_desc_hobbyist: '{count} events to become Hobbyist',

        // Privacy Policy Content
        privacy_title: 'Privacy Policy',
        privacy_last_update: 'Last update: January 1, 2026',
        privacy_intro: 'At iLoveGallery, we value your privacy. This policy describes how we handle your photos and personal data.',
        privacy_item_1_title: '1. Photos and Videos:',
        privacy_item_1_desc: 'All content you upload to an event is shared only with participants of that event who have the access code.',
        privacy_item_2_title: '2. User Data:',
        privacy_item_2_desc: 'We collect your email and name to manage your account and events. We do not sell your data to third parties.',
        privacy_item_3_title: '3. Deletion:',
        privacy_item_3_desc: 'You can delete your account and all associated data at any time from your profile settings.',
        privacy_item_4_title: '4. Security:',
        privacy_item_4_desc: 'We use Google Firebase to ensure your data is protected with enterprise-level security standards.',

        // About Content
        about_version: 'Version {version}',
        about_desc: 'iLoveGallery is a social disposable camera experience designed to capture authentic moments at your special events.\n\nCreate an event, invite your friends, and enjoy capturing photos that will only be revealed when the roll is full or the event ends.',
        about_footer: 'Made with ❤️ for unforgettable moments.',
    }
};

// --- THEMES ---
const darkTheme = {
    background: '#120D0A',
    card: '#1E1915',
    text: '#FFF',
    textSecondary: '#8E8E93',
    border: '#2A221B',
    tint: '#FF6B00',
    error: '#FF3B30',
};

const lightTheme = {
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000',
    textSecondary: '#636366',
    border: '#C6C6C8',
    tint: '#FF6B00',
    error: '#FF3B30',
};

type ThemeType = typeof darkTheme;
type LanguageType = 'es' | 'en';

interface AppSettingsContextType {
    theme: ThemeType;
    isDark: boolean;
    language: LanguageType;
    autoSaveToGallery: boolean;
    notificationsEnabled: boolean;
    t: (key: keyof typeof translations['es'], params?: Record<string, any>) => string;
    toggleTheme: () => void;
    setLanguage: (lang: LanguageType) => void;
    setAutoSaveToGallery: (value: boolean) => void;
    setNotificationsEnabled: (value: boolean) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(true);
    const [language, setLang] = useState<LanguageType>('en');
    const [autoSaveToGallery, setAutoSave] = useState(true);
    const [notificationsEnabled, setNotifications] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('app_theme');
            const savedLang = await AsyncStorage.getItem('app_lang');
            const savedAutoSave = await AsyncStorage.getItem('app_autosave');
            const savedNotifications = await AsyncStorage.getItem('app_notifications');

            if (savedTheme !== null) setIsDark(savedTheme === 'dark');
            if (savedLang !== null) setLang(savedLang as LanguageType);
            if (savedAutoSave !== null) setAutoSave(savedAutoSave === 'true');
            if (savedNotifications !== null) setNotifications(savedNotifications === 'true');
        } catch (e) {
            console.error(e);
        }
    };

    const toggleTheme = async () => {
        const newVal = !isDark;
        setIsDark(newVal);
        await AsyncStorage.setItem('app_theme', newVal ? 'dark' : 'light');
    };

    const setLanguage = async (lang: LanguageType) => {
        setLang(lang);
        await AsyncStorage.setItem('app_lang', lang);
    };

    const setAutoSaveToGallery = async (value: boolean) => {
        setAutoSave(value);
        await AsyncStorage.setItem('app_autosave', value.toString());
    };

    const setNotificationsEnabled = async (value: boolean) => {
        setNotifications(value);
        await AsyncStorage.setItem('app_notifications', value.toString());
    };

    const t = (key: keyof typeof translations['es'], params?: Record<string, any>) => {
        let text = translations[language][key] || key;
        if (params) {
            Object.keys(params).forEach(pKey => {
                text = text.replace(`{${pKey}}`, params[pKey]);
            });
        }
        return text;
    };

    const theme = isDark ? darkTheme : lightTheme;

    return (
        <AppSettingsContext.Provider value={{
            theme,
            isDark,
            language,
            autoSaveToGallery,
            notificationsEnabled,
            t,
            toggleTheme,
            setLanguage,
            setAutoSaveToGallery,
            setNotificationsEnabled
        }}>
            {children}
        </AppSettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(AppSettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within an AppSettingsProvider');
    }
    return context;
}
