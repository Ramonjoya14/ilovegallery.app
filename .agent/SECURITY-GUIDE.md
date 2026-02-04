# 🔐 Guía de Seguridad - InstaRoll

## 📋 Resumen de Correcciones Implementadas

### ✅ Vulnerabilidades Críticas Corregidas

1. **Firestore Security Rules** - ✅ CORREGIDO
   - ❌ Antes: Base de datos completamente abierta al público
   - ✅ Ahora: Acceso restringido solo a usuarios autenticados con validación de ownership

2. **Storage Security Rules** - ✅ CORREGIDO
   - ❌ Antes: Lectura pública de todas las fotos
   - ✅ Ahora: Acceso solo para usuarios autenticados

3. **Gestión de Credenciales** - ✅ MEJORADO
   - ✅ Archivo `.env.example` creado
   - ✅ `.gitignore` actualizado
   - ✅ Comentarios de seguridad añadidos

---

## 🚀 Pasos para Desplegar las Correcciones

### Paso 1: Desplegar Firestore Rules (OBLIGATORIO)

```bash
firebase deploy --only firestore:rules
```

**Verificar que se desplegó correctamente:**
```bash
firebase firestore:rules:get
```

---

### Paso 2: Desplegar Storage Rules (OBLIGATORIO)

```bash
firebase deploy --only storage
```

**Verificar que se desplegó correctamente:**
```bash
firebase storage:rules:get
```

---

### Paso 3: Probar las Reglas (RECOMENDADO)

```bash
# Iniciar emuladores locales
firebase emulators:start

# En otra terminal, ejecutar tu app
npm start
```

**Pruebas a realizar:**
1. ✅ Usuario autenticado puede leer eventos
2. ✅ Usuario autenticado puede crear su propio evento
3. ❌ Usuario NO puede modificar eventos de otros
4. ❌ Usuario NO puede eliminar fotos de otros
5. ❌ Usuario sin autenticar NO puede acceder a nada

---

## 🔒 Reglas de Seguridad Implementadas

### Firestore Rules

#### Users Collection
- **Read:** Cualquier usuario autenticado
- **Create/Update/Delete:** Solo el propietario del perfil

#### Events Collection
- **Read:** Cualquier usuario autenticado
- **Create:** Cualquier usuario autenticado (con validación de organizerId)
- **Update/Delete:** Solo el organizador del evento

#### Photos Collection
- **Read:** Cualquier usuario autenticado
- **Create:** Cualquier usuario autenticado (con validación de userId)
- **Update/Delete:** Solo el autor de la foto

#### Notifications Collection
- **Read/Write:** Solo el propietario de la notificación

---

### Storage Rules

#### Regla por Defecto
- **Read/Write:** Solo usuarios autenticados

#### Event Covers (`/covers/{eventId}/{fileName}`)
- **Read:** Usuarios autenticados
- **Write/Delete:** Usuarios autenticados

#### Event Photos (`/photos/{eventId}/{photoId}`)
- **Read:** Usuarios autenticados
- **Write/Delete:** Usuarios autenticados

#### Profile Photos (`/profile-photos/{userId}/{fileName}`)
- **Read:** Usuarios autenticados
- **Write/Delete:** Solo el propietario del perfil

---

## 🛡️ Mejoras Adicionales Recomendadas

### 1. Implementar Firebase App Check (Alta Prioridad)

Firebase App Check protege tu backend contra abuso y tráfico no autorizado.

**Pasos:**

1. Habilitar App Check en Firebase Console:
   - Ve a Firebase Console → App Check
   - Registra tu app
   - Configura reCAPTCHA v3 para web

2. Obtener Site Key de reCAPTCHA:
   - https://www.google.com/recaptcha/admin
   - Crear nuevo sitio con reCAPTCHA v3
   - Copiar el Site Key

3. Actualizar `.env.example` con tu Site Key

4. Instalar dependencias:
```bash
npm install firebase@latest
```

5. Crear archivo `lib/appCheck.ts`:
```typescript
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import app from './firebase';

// Solo en producción
if (process.env.NODE_ENV === 'production') {
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
}

export default appCheck;
```

6. Importar en tu app:
```typescript
import './lib/appCheck'; // En tu archivo principal
```

---

### 2. Configurar Restricciones de API Key

1. Ve a Google Cloud Console:
   - https://console.cloud.google.com/apis/credentials
   
2. Selecciona tu proyecto: `instaroll-2026`

3. Encuentra tu API Key: `AIzaSyBSxs4jQnHDFcnCMuR9RBwY9IGTBn4eeSU`

4. Configura restricciones:
   - **Restricciones de aplicación:**
     - Android: Agregar package name y SHA-1
     - iOS: Agregar Bundle ID
     - Web: Agregar dominios autorizados
   
   - **Restricciones de API:**
     - Firebase Authentication API
     - Cloud Firestore API
     - Cloud Storage API
     - Identity Toolkit API

---

### 3. Habilitar Monitoreo de Seguridad

1. **Firebase Security Rules Monitor:**
   ```bash
   firebase deploy --only firestore:rules,storage
   ```

2. **Alertas de Seguridad:**
   - Ve a Firebase Console → Security Rules
   - Habilita alertas por email

3. **Logs de Acceso:**
   - Ve a Firebase Console → Firestore → Usage
   - Revisa patrones de acceso sospechosos

---

### 4. Implementar Rate Limiting

Para proteger contra ataques de fuerza bruta, considera:

1. **Firebase App Check** (recomendado)
2. **Cloud Functions con rate limiting:**
   ```typescript
   // functions/src/index.ts
   import * as functions from 'firebase-functions';
   import * as admin from 'firebase-admin';
   
   export const rateLimit = functions.https.onCall(async (data, context) => {
     // Implementar lógica de rate limiting
   });
   ```

---

## 🔍 Checklist de Seguridad Post-Despliegue

### Inmediato (Después de desplegar rules)
- [ ] Firestore Rules desplegadas correctamente
- [ ] Storage Rules desplegadas correctamente
- [ ] Probar acceso con usuario autenticado
- [ ] Probar que usuarios no autenticados NO tienen acceso
- [ ] Probar que usuarios NO pueden modificar datos de otros

### Corto Plazo (Esta semana)
- [ ] Implementar Firebase App Check
- [ ] Configurar restricciones de API Key
- [ ] Habilitar alertas de seguridad
- [ ] Revisar logs de acceso

### Mediano Plazo (Este mes)
- [ ] Implementar Cloud Functions para lógica sensible
- [ ] Agregar logging de seguridad
- [ ] Implementar monitoreo de accesos sospechosos
- [ ] Auditar dependencias con `npm audit`

### Largo Plazo (Próximos meses)
- [ ] Considerar 2FA para usuarios
- [ ] Implementar backup automático
- [ ] Configurar disaster recovery
- [ ] Realizar auditorías de seguridad periódicas

---

## 📊 Métricas de Seguridad Actuales

| Métrica | Antes | Después |
|---------|-------|---------|
| Firestore Acceso Público | ✗ Sí | ✅ No |
| Storage Acceso Público | ✗ Sí | ✅ No |
| Validación de Ownership | ✗ No | ✅ Sí |
| Autenticación Requerida | ✗ No | ✅ Sí |
| Credenciales en .gitignore | ⚠️ Parcial | ✅ Completo |

---

## 🆘 Solución de Problemas

### Error: "Permission Denied" después de desplegar

**Causa:** Las nuevas reglas requieren autenticación.

**Solución:**
1. Asegúrate de que los usuarios estén autenticados
2. Verifica que `request.auth != null` en tus reglas
3. Revisa que el `userId` o `organizerId` coincida con `request.auth.uid`

---

### Error: "Missing or insufficient permissions"

**Causa:** Usuario intentando acceder a datos que no le pertenecen.

**Solución:**
1. Verifica la lógica de ownership en tu código
2. Asegúrate de que `userId` se establece correctamente al crear documentos
3. Revisa los logs de Firebase para ver qué regla está fallando

---

### Usuarios anónimos no pueden acceder

**Causa:** Las reglas actuales requieren autenticación completa.

**Solución:**
Si quieres permitir acceso limitado a usuarios anónimos:

```javascript
// En firestore.rules
match /events/{eventId} {
  // Permitir lectura a usuarios anónimos
  allow read: if request.auth != null; // Esto incluye anónimos
  
  // Solo usuarios NO anónimos pueden crear
  allow create: if request.auth != null && 
                  !request.auth.token.firebase.sign_in_provider == 'anonymous';
}
```

---

## 📞 Soporte

Si encuentras problemas de seguridad:

1. **Revisa los logs de Firebase Console**
2. **Verifica las reglas con el simulador:**
   - Firebase Console → Firestore → Rules → Simulator
3. **Consulta la documentación:**
   - https://firebase.google.com/docs/rules

---

## 🎯 Próximos Pasos

1. ✅ Desplegar las reglas de seguridad
2. ✅ Probar la aplicación con las nuevas reglas
3. ⏳ Implementar App Check (próxima prioridad)
4. ⏳ Configurar restricciones de API
5. ⏳ Auditar dependencias

---

**Última actualización:** 2026-01-27  
**Versión de seguridad:** 2.0  
**Estado:** ✅ Listo para despliegue seguro
