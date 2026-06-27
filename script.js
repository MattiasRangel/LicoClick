// =================================================================
// LICO-CLICK — script.js v6.0
// Supabase Cloud Edition · Bug de sesión corregido
// =================================================================

// ---- CONFIGURACIÓN SUPABASE ----
const SUPABASE_URL = "https://zdmlzhncujjmzmysktsq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkbWx6aG5jdWpqbXpteXNrdHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MzI2MTAsImV4cCI6MjA5NjEwODYxMH0.2x6zIoTGx_nfsSdMY6rkduqx2_Es9jBa_jF9DVGCgvA";

// ----------------------------------------------------------------
// FIX CRÍTICO: NO inicializar db en el nivel raíz del script.
// Si el CDN de Supabase tarda un milisegundo más de lo esperado,
// "window.supabase" es undefined aquí y el script entero aborta,
// haciendo que protegerPagina() nunca llegue a ejecutarse.
// En su lugar usamos un getter lazy que se llama solo cuando se
// necesita hacer una petición real, garantizando que el SDK ya esté cargado.
// ----------------------------------------------------------------
let _db = null;
function getDb() {
    if (!_db) {
        if (!window.supabase) {
            throw new Error('SDK de Supabase no cargado. Verifica la etiqueta <script> del CDN en el HTML.');
        }
        _db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return _db;
}

// ---- CATÁLOGO LOCAL DE PRODUCTOS ----
const PRODUCTOS_DB = {
    agua_botella:         { nombre: 'Botella de Agua',      precio: 2000  },
    agua_gas:             { nombre: 'Agua con Gas',          precio: 3000  },
    aguila_botella:       { nombre: 'Águila Botella',        precio: 7000  },
    poker_1000:           { nombre: 'Póker Botella 1000ml',  precio: 7000  },
    aguila_light_botella: { nombre: 'Águila Light Botella',  precio: 7000  },
    aguila_light_lata:    { nombre: 'Águila Light Lata',     precio: 3000  },
    aguilita:             { nombre: 'Aguilita',              precio: 3000  },
    aguila_lata_gorda:    { nombre: 'Águila Lata Gorda',     precio: 4000  },
    poker_lata_gorda:     { nombre: 'Póker Lata Gorda',      precio: 4000  },
    amper:                { nombre: 'Amper',                 precio: 4000  },
    bretana:              { nombre: 'Bretaña',               precio: 3500  },
    lata_club_colombia:   { nombre: 'Lata Club Colombia',    precio: 3500  },
    lata_cola_pola:       { nombre: 'Lata Cola y Pola',      precio: 4000  },
    coronita:             { nombre: 'Coronita',              precio: 4000  },
    costena_botella:      { nombre: 'Costeña Botella',       precio: 5000  },
    costeña_lata:         { nombre: 'Costeña Lata',          precio: 35000 },
    reds_lata:         { nombre: 'Reds Lata',          precio: 4000 },
    media_ron:            { nombre: 'Media de Ron',          precio: 35000 },
    ron_750:              { nombre: 'Ron 750',          precio: 35000 },
    media_aguardiente_azul:     { nombre: 'Media de aguardiente azul',          precio: 30000 },
    media_amarillo:             { nombre: 'Media de Amarillo',          precio: 35000 },
    media_amarillo_750:         { nombre: 'Media de Amarillo 750',          precio: 35000 },
    media_verde:          { nombre: 'Media verde',          precio: 35000 },
    media_verde:          { nombre: 'Media verde',          precio: 35000 },


    hydrolate:            { nombre: 'Hydrolate',          precio: 35000 },
    sporade:              { nombre: 'Sporade',               precio: 3500  },
    vive100:              { nombre: 'Vive100',               precio: 4000  },
    budweiser_lata:       { nombre: 'Budweiser Lata',        precio: 3500  }
};

// =================================================================
// FORMATO DE VENTA POR PRODUCTO
// Productos con latas: 'unit' | 'six' (×6) | 'tray' (×24)
// Productos con botella: 'unit' | 'half' (×7) | 'box' (×13)
// =================================================================
const FORMATO_CONFIG = {
    // Latas (sixpack=6 / bandeja=24)
    aguilita:           { type:'can', unitPrice:3000 },
    aguila_lata_gorda:  { type:'can', unitPrice:4000 },
    aguila_light_lata:  { type:'can', unitPrice:3000 },
    poker_lata_gorda:   { type:'can', unitPrice:4000 },
    lata_club_colombia: { type:'can', unitPrice:3500 },
    budweiser_lata:     { type:'can', unitPrice:3500 },
    coronita:           { type:'can', unitPrice:4000 },
    amper:              { type:'can', unitPrice:4000 },
    bretana:            { type:'can', unitPrice:3500 },
    lata_cola_pola:     { type:'can', unitPrice:4000 },
    sporade:            { type:'can', unitPrice:3500 },
    vive100:            { type:'can', unitPrice:4000 },
    reds_lata:          { type:'can', unitPrice:4000 },
    'costeña_lata':     { type:'can', unitPrice:35000 },
    // Botellas (media caja=7 / caja=13)
    aguila_botella:     { type:'bottle', unitPrice:7000 },
    poker_1000:         { type:'bottle', unitPrice:7000 },
};

// Estado activo de formato por producto
// { idProducto: { mode:'unit'|'six'|'tray'|'half'|'box', customPrice: number|null } }
const fmtEstado = {};

// Retiro de caja pendiente para confirmar en modal
let _sacarCajaPendiente = { monto: 0, motivo: '' };

// Formato actual que se está configurando en el modal
let _fmtPendiente = { id: null, mode: null };
// =================================================================

// =================================================================
// SISTEMA DE EDICIÓN DE PRECIOS
// Guardado en localStorage con clave 'licoclick_precios'.
// Se carga al arrancar y sincroniza PRODUCTOS_DB + FORMATO_CONFIG.
// =================================================================

function cargarPreciosGuardados() {
    try {
        const guardados = JSON.parse(localStorage.getItem('licoclick_precios')) || {};
        Object.keys(guardados).forEach(id => {
            if (PRODUCTOS_DB[id]) {
                PRODUCTOS_DB[id].precio = guardados[id];
            }
            if (FORMATO_CONFIG[id]) {
                FORMATO_CONFIG[id].unitPrice = guardados[id];
            }
        });
    } catch { /* nada */ }
}

let _modoEdicionActivo = false;

function toggleModoEdicion() {
    _modoEdicionActivo = !_modoEdicionActivo;
    const btn = document.getElementById('btn-edit-prices');

    if (_modoEdicionActivo) {
        if (btn) btn.classList.add('active');
        mostrarInputsEdicion();
        mostrarToast('✏️ Toca el precio amarillo para editarlo');
    } else {
        if (btn) btn.classList.remove('active');
        guardarYAplicarPrecios();
        ocultarInputsEdicion();
        mostrarToast('✅ Precios guardados');
    }
}

function mostrarInputsEdicion() {
    // Primero limpiar cualquier input previo que pudiera haber quedado
    // Esto evita el bug de "dos precios" si se activa dos veces
    ocultarInputsEdicion();

    Object.keys(PRODUCTOS_DB).forEach(id => {
        const span = document.getElementById(`price-label-${id}`);
        if (!span) return;

        // Guardar precio actual en el span para restaurarlo al cancelar
        const precioActual = PRODUCTOS_DB[id].precio;

        const input = document.createElement('input');
        input.type       = 'number';
        input.id         = `price-edit-${id}`;
        input.value      = precioActual;
        input.min        = '500';
        input.step       = '500';
        input.className  = 'price-edit-input';
        input.dataset.id = id;

        // CRÍTICO: evitar que el tap propague al botón de producto o modal de formato
        input.addEventListener('click',   e => e.stopPropagation());
        input.addEventListener('touchend', e => e.stopPropagation());
        input.addEventListener('pointerdown', e => e.stopPropagation());

        span.style.display = 'none';
        span.parentNode.insertBefore(input, span);
    });
}

function ocultarInputsEdicion() {
    document.querySelectorAll('.price-edit-input').forEach(input => {
        const span = document.getElementById(`price-label-${input.dataset.id}`);
        if (span) span.style.display = '';
        input.remove();
    });
}

function guardarYAplicarPrecios() {
    const nuevos = {};
    document.querySelectorAll('.price-edit-input').forEach(input => {
        const id     = input.dataset.id;
        const precio = parseInt(input.value);
        if (!id || !precio || precio < 500) return;

        nuevos[id] = precio;

        // FIX: era 'PRODUCTS_DB' (typo) — corregido a 'PRODUCTOS_DB'
        if (PRODUCTOS_DB[id]) PRODUCTOS_DB[id].precio = precio;
        if (FORMATO_CONFIG[id]) FORMATO_CONFIG[id].unitPrice = precio;

        // Actualizar el label visible con el precio nuevo
        const span = document.getElementById(`price-label-${id}`);
        if (span) span.innerText = `$${precio.toLocaleString('es-CO')}`;
    });

    // Combinar con precios ya guardados (no borrar los que no se tocaron ahora)
    try {
        const previos = JSON.parse(localStorage.getItem('licoclick_precios')) || {};
        localStorage.setItem('licoclick_precios', JSON.stringify({ ...previos, ...nuevos }));
    } catch { /* nada */ }
}

function actualizarLabelsPrecio() {
    Object.keys(PRODUCTOS_DB).forEach(id => {
        const el = document.getElementById(`price-label-${id}`);
        if (el) el.innerText = `$${PRODUCTOS_DB[id].precio.toLocaleString('es-CO')}`;
    });
}

// =================================================================
// SESIÓN
 /* Devuelve el objeto { id, nombre, rol } o null.
 */
function obtenerSesion() {
    try {
        const raw = localStorage.getItem('licoclick_sesion');
        if (!raw) return null;
        const sesion = JSON.parse(raw);
        // Validar que tenga al menos el campo nombre
        if (!sesion || typeof sesion.nombre !== 'string' || sesion.nombre.trim() === '') return null;
        return sesion;
    } catch {
        return null;
    }
}

/**
 * FIX: protegerPagina() es SÍNCRONA y pura.
 * Lee localStorage de forma directa — sin async, sin Supabase, sin timers.
 * localStorage.getItem() es 100% síncrono en todos los navegadores;
 * no hay condición de carrera posible aquí.
 * Si la sesión no existe o es inválida → redirige y devuelve null.
 * Si es válida → devuelve el objeto de sesión.
 */
function protegerPagina() {
    const sesion = obtenerSesion();
    if (!sesion) {
        // Evitar bucle: solo redirigir si NO estamos ya en login.html
        if (!window.location.pathname.includes('login')) {
            window.location.replace('login.html');
        }
        return null;
    }
    return sesion;
}

// =================================================================
// CARRITO (estado en memoria, caché en localStorage)
// =================================================================
let carrito = {};
try {
    carrito = JSON.parse(localStorage.getItem('licoclick_carrito')) || {};
} catch { carrito = {}; }

function guardarCarrito() {
    localStorage.setItem('licoclick_carrito', JSON.stringify(carrito));
}

// =================================================================
// MENÚ HAMBURGUESA
// =================================================================
function toggleMenu() {
    const panel   = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    if (!panel) return;
    const open = panel.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open', open);
}

function closeMenu() {
    const panel   = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    if (panel)   panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// =================================================================
// ENRUTADOR — se ejecuta cuando el DOM está completamente listo
// =================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar precios personalizados antes de renderizar cualquier página
    cargarPreciosGuardados();

    // index.html
    if (document.getElementById('cart-container')) {
        iniciarPaginaPOS();
        return;
    }
    // fiados.html
    if (document.getElementById('lista-fiados')) {
        await iniciarPaginaFiados();
        return;
    }
    // resumen.html
    if (document.getElementById('resumen-ventas-total')) {
        await iniciarPaginaResumen();
        return;
    }
});

// =================================================================
// POS — index.html
// =================================================================
function iniciarPaginaPOS() {
    const sesion = protegerPagina();
    if (!sesion) return;

    const elNombre = document.getElementById('active-user-name');
    const elRol    = document.getElementById('active-user-role');
    if (elNombre) elNombre.innerText = sesion.nombre;
    if (elRol)    elRol.innerText    = sesion.rol || 'Cajero';

    actualizarLabelsPrecio();
    actualizarPantallaCarrito();
}

// ---- Steppers ----
function stepProductCardQty(idProducto, cambio) {
    const el = document.getElementById(`qty-${idProducto}`);
    if (!el) return;
    el.value = Math.max(1, (parseInt(el.value) || 1) + cambio);
}

function validateCardQty(input) {
    const v = parseInt(input.value);
    if (isNaN(v) || v < 1) input.value = 1;
}

// ---- Agregar al carrito (respeta formato activo) ----
function addProductFromCard(idProducto) {
    const el       = document.getElementById(`qty-${idProducto}`);
    const cantidad = parseInt(el?.value) || 1;

    const estado  = fmtEstado[idProducto];
    const cfg     = FORMATO_CONFIG[idProducto];
    const defPrecio = PRODUCTOS_DB[idProducto].precio;

    let precioFinal  = defPrecio;
    let nombreFinal  = PRODUCTOS_DB[idProducto].nombre;
    let cantidadReal = cantidad;

    if (cfg && estado && estado.mode !== 'unit') {
        const qtdPaq = (estado.mode === 'six')  ? 6
                     : (estado.mode === 'tray') ? 24
                     : (estado.mode === 'half') ? 7
                     : (estado.mode === 'box')  ? 13 : 1;
        cantidadReal = cantidad * qtdPaq;

        const label = (estado.mode === 'six')  ? 'Sixpack'
                    : (estado.mode === 'tray') ? 'Bandeja'
                    : (estado.mode === 'half') ? 'Med. Caja'
                    : 'Caja';
        nombreFinal = `${PRODUCTOS_DB[idProducto].nombre} (${label})`;

        // Precio: personalizado → precio por unidad × cantidad del paquete
        precioFinal = estado.customPrice != null
            ? estado.customPrice
            : defPrecio * qtdPaq;
        cantidadReal = cantidad; // cada ítem del carrito = 1 paquete
    }

    const clave = `${idProducto}_${estado?.mode || 'unit'}_${Date.now()}`;

    if (carrito[idProducto] && (!cfg || !estado || estado.mode === 'unit')) {
        // Mismo producto en modo unidad → acumular
        carrito[idProducto].cantidad += cantidadReal;
    } else {
        carrito[clave] = {
            nombre:   nombreFinal,
            precio:   precioFinal,
            cantidad: cantidadReal
        };
    }

    if (el) el.value = 1;
    actualizarPantallaCarrito();
}

function addCustomProduct() {
    const nameInput  = document.getElementById('custom-name-input');
    const priceInput = document.getElementById('custom-price-input');
    const qtyInput   = document.getElementById('qty-custom');

    const nombre   = nameInput?.value.trim()     || 'Venta Manual';
    const precio   = parseInt(priceInput?.value) || 0;
    const cantidad = parseInt(qtyInput?.value)   || 1;

    if (precio <= 0) { alert('Por favor, ingresa un precio válido.'); return; }

    carrito['custom_' + Date.now()] = { nombre, precio, cantidad };
    if (nameInput) nameInput.value  = 'Venta Manual';
    if (qtyInput)  qtyInput.value   = 1;
    actualizarPantallaCarrito();
}

// =================================================================
// FORMATO DE VENTA — Tabs en las cards
// =================================================================
function setFmt(idProducto, mode, tabEl) {
    // Actualizar tabs activos visualmente
    const card = document.getElementById(`card-${idProducto}`);
    if (card) {
        card.querySelectorAll('.fmt-tab').forEach(t => t.classList.remove('active'));
        if (tabEl) tabEl.classList.add('active');
    }

    if (mode === 'unit') {
        // Volver a precio unitario normal
        fmtEstado[idProducto] = { mode: 'unit', customPrice: null };
        _actualizarLabelPrecio(idProducto);
        return;
    }

    // Para cualquier formato no-unitario, abrir modal de precio
    _fmtPendiente = { id: idProducto, mode };
    const cfg      = FORMATO_CONFIG[idProducto];
    const qtdPaq   = (mode === 'six')  ? 6
                   : (mode === 'tray') ? 24
                   : (mode === 'half') ? 7
                   : (mode === 'box')  ? 13 : 1;
    const label    = (mode === 'six')  ? 'Sixpack (6 und)'
                   : (mode === 'tray') ? 'Bandeja (24 und)'
                   : (mode === 'half') ? 'Media Caja (7 und)'
                   : 'Caja Completa (13 und)';
    const defPrecio = (cfg?.unitPrice || PRODUCTOS_DB[idProducto].precio) * qtdPaq;

    const iconEl   = document.getElementById('fmt-modal-icon');
    const titleEl  = document.getElementById('fmt-modal-title');
    const hintEl   = document.getElementById('fmt-modal-hint');
    const labelEl  = document.getElementById('fmt-modal-label');
    const defEl    = document.getElementById('fmt-precio-defecto');
    const inputEl  = document.getElementById('input-fmt-precio');

    if (iconEl)  iconEl.innerText  = mode === 'tray' || mode === 'box' ? '📦' : '🍺';
    if (titleEl) titleEl.innerText = `Precio — ${label}`;
    if (hintEl)  hintEl.innerText  = `Ajusta el precio del ${label} para ${PRODUCTOS_DB[idProducto].nombre}. Dejar vacío aplica el precio por unidad × ${qtdPaq}.`;
    if (labelEl) labelEl.innerText = `Precio del ${label}`;
    if (defEl)   defEl.innerText   = `Precio por unidad × ${qtdPaq} = $${defPrecio.toLocaleString('es-CO')} (si dejas vacío)`;
    if (inputEl) inputEl.value     = '';

    document.getElementById('modal-formato').classList.add('open');
    setTimeout(() => inputEl?.focus(), 150);
}

function cerrarModalFormato() {
    document.getElementById('modal-formato')?.classList.remove('open');
    // Si el usuario canceló, volver el tab a 'unit'
    const id = _fmtPendiente.id;
    if (id) {
        const card = document.getElementById(`card-${id}`);
        if (card) {
            card.querySelectorAll('.fmt-tab').forEach((t, i) => {
                t.classList.toggle('active', i === 0);
            });
        }
        fmtEstado[id] = { mode: 'unit', customPrice: null };
        _actualizarLabelPrecio(id);
    }
    _fmtPendiente = { id: null, mode: null };
}

function aplicarFormato() {
    const { id, mode } = _fmtPendiente;
    if (!id || !mode) return;

    const inputEl    = document.getElementById('input-fmt-precio');
    const rawVal     = parseInt(inputEl?.value);
    const customPrice = (!isNaN(rawVal) && rawVal > 0) ? rawVal : null;

    fmtEstado[id] = { mode, customPrice };
    _actualizarLabelPrecio(id);
    document.getElementById('modal-formato')?.classList.remove('open');
    _fmtPendiente = { id: null, mode: null };
    mostrarToast('✅ Formato actualizado');
}

function _actualizarLabelPrecio(idProducto) {
    const labelEl  = document.getElementById(`price-label-${idProducto}`);
    if (!labelEl) return;
    const estado  = fmtEstado[idProducto];
    const cfg     = FORMATO_CONFIG[idProducto];
    const defUnit = cfg?.unitPrice || PRODUCTOS_DB[idProducto].precio;

    if (!estado || estado.mode === 'unit') {
        labelEl.innerText = `$${defUnit.toLocaleString('es-CO')}`;
        return;
    }
    const qtdPaq = (estado.mode === 'six')  ? 6
                 : (estado.mode === 'tray') ? 24
                 : (estado.mode === 'half') ? 7
                 : (estado.mode === 'box')  ? 13 : 1;
    const precio = estado.customPrice != null ? estado.customPrice : defUnit * qtdPaq;
    const tag    = (estado.mode === 'six')  ? '×6'
                 : (estado.mode === 'tray') ? '×24'
                 : (estado.mode === 'half') ? '×7'
                 : '×13';
    labelEl.innerText = `$${precio.toLocaleString('es-CO')} ${tag}`;
}

// =================================================================
// SACAR DINERO DE CAJA
// =================================================================
function abrirModalSacarCaja() {
    document.getElementById('input-sacar-monto').value  = '';
    document.getElementById('input-sacar-motivo').value = '';
    document.getElementById('modal-sacar-caja').classList.add('open');
    setTimeout(() => document.getElementById('input-sacar-monto')?.focus(), 150);
}

function cerrarModalSacarCaja() {
    document.getElementById('modal-sacar-caja')?.classList.remove('open');
}

async function confirmarSacarCaja() {
    const montoEl  = document.getElementById('input-sacar-monto');
    const motivoEl = document.getElementById('input-sacar-motivo');
    const monto    = parseInt(montoEl?.value);
    const motivo   = motivoEl?.value.trim() || 'Sin especificar';

    if (!monto || monto <= 0) {
        montoEl?.classList.add('shake');
        setTimeout(() => montoEl?.classList.remove('shake'), 400);
        return;
    }

    // Deshabilitar el botón con el selector correcto (hay dos modal-btn-confirm posibles)
    const btnConfirmar = document.querySelector('#modal-sacar-caja .modal-btn-confirm');
    if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.innerHTML = '⏳ Guardando...'; }

    // ── PASO 1: Guardar siempre en localStorage como respaldo inmediato ──
    const entrada = { monto, motivo, fecha: new Date().toISOString() };
    try {
        const retiros = JSON.parse(localStorage.getItem('licoclick_retiros') || '[]');
        retiros.push(entrada);
        localStorage.setItem('licoclick_retiros', JSON.stringify(retiros));
    } catch (lsErr) {
        console.warn('No se pudo guardar en localStorage:', lsErr);
    }

    // ── PASO 2: Intentar guardar en Supabase ──
    // IMPORTANTE: Los nombres de columna deben coincidir EXACTAMENTE con tu tabla.
    // Si el insert falla, el retiro ya quedó en localStorage para el cuadre del turno.
    // Revisa la consola para ver el error exacto de Supabase.
    let guardadoEnNube = false;
    try {
        const db     = getDb();
        const sesion = obtenerSesion();

        // Intentamos con los nombres de columna más comunes.
        // Si sigue fallando, revisa el error en consola y ajusta los nombres aquí:
        const payload = {
            cajero_nombre: sesion?.nombre || 'Desconocido',
            monto:         monto,
            motivo:        motivo
            // created_at se llena automáticamente por Supabase (columna default)
        };

        console.log('[retiros_caja] Intentando INSERT con payload:', payload);

        const { data, error } = await db
            .from('retiros_caja')
            .insert(payload)
            .select(); // .select() fuerza que Supabase devuelva la fila insertada → más info en el error

        if (error) {
            // LOG DETALLADO para diagnóstico
            console.error('[retiros_caja] Error de Supabase:');
            console.error('  message:', error.message);
            console.error('  code:', error.code);
            console.error('  details:', error.details);
            console.error('  hint:', error.hint);
            console.error('  objeto completo:', JSON.stringify(error, null, 2));
            throw error;
        }

        console.log('[retiros_caja] INSERT exitoso:', data);
        guardadoEnNube = true;

    } catch (err) {
        // El retiro YA está en localStorage, así que el cuadre de caja funcionará.
        // El toast informa al cajero del estado real.
        console.error('[retiros_caja] Fallo al guardar en Supabase (guardado en local como respaldo):', err);
    }

    // ── PASO 3: Cerrar modal y notificar ──
    cerrarModalSacarCaja();
    const toastMsg = guardadoEnNube
        ? `💸 $${monto.toLocaleString('es-CO')} registrado`
        : `💸 $${monto.toLocaleString('es-CO')} guardado localmente (sin conexión)`;
    mostrarToast(toastMsg);

    if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.innerHTML = '💸 Registrar Retiro'; }

    // Refrescar resumen si estamos en esa página
    if (typeof renderizarResumen === 'function' && document.getElementById('resumen-retiros-total')) {
        renderizarResumen();
    }
}

// ---- Renderizar carrito ----
function actualizarPantallaCarrito() {
    guardarCarrito();
    const container = document.getElementById('cart-container');
    if (!container) return;

    const llaves = Object.keys(carrito);

    if (llaves.length === 0) {
        container.innerHTML = '<div class="empty-cart-msg">El pedido está vacío · toca un producto abajo</div>';
        const el = document.getElementById('cart-total-value');
        if (el) el.innerText = '$0';
        return;
    }

    container.innerHTML = '';
    let total = 0;

    llaves.forEach(id => {
        const item     = carrito[id];
        const subtotal = item.precio * item.cantidad;
        total += subtotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="item-details">
                <span class="item-name">${item.nombre}</span>
                <span class="item-meta">${item.cantidad} ud. × $${item.precio.toLocaleString('es-CO')}</span>
            </div>
            <span class="item-subtotal">$${subtotal.toLocaleString('es-CO')}</span>
            <button class="btn-delete-item" onclick="deleteCartItem('${id}')">🗑️</button>`;
        container.appendChild(div);
    });

    const elTotal = document.getElementById('cart-total-value');
    if (elTotal) elTotal.innerText = `$${total.toLocaleString('es-CO')}`;
    container.scrollTop = container.scrollHeight;
}


// ---- Eliminar ítem del carrito POS ----
function deleteCartItem(id) {
    delete carrito[id];
    actualizarPantallaCarrito();
}
// ---- REGISTRAR VENTA → Supabase ----
async function processCheckout() {
    const llaves = Object.keys(carrito);
    if (llaves.length === 0) { alert('No hay productos en el pedido.'); return; }

    const sesion = obtenerSesion();
    const btn    = document.querySelector('.btn-checkout');

    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando...'; }

    try {
        const db = getDb();
        const totalVenta = llaves.reduce(
            (sum, id) => sum + carrito[id].precio * carrito[id].cantidad, 0
        );

        // 1. Insertar cabecera de venta
        const { data: ventaData, error: ventaErr } = await db
            .from('ventas')
            .insert({
                total_venta:   totalVenta,
                metodo_pago:   'efectivo',
                cajero_nombre: sesion?.nombre || 'Desconocido'
            })
            .select('id')
            .single();

        if (ventaErr) throw ventaErr;

        // 2. Insertar ítems de venta
        const items = llaves.map(id => ({
            venta_id:        ventaData.id,
            producto_nombre: carrito[id].nombre,
            precio:          carrito[id].precio,
            cantidad:        carrito[id].cantidad
        }));

        const { error: itemsErr } = await db.from('venta_items').insert(items);
        if (itemsErr) throw itemsErr;

        // 3. Limpiar carrito
        carrito = {};
        actualizarPantallaCarrito();
        mostrarToast('✅ Venta guardada en la nube');

        if (btn) {
            btn.innerHTML = '✅ ¡Venta Registrada!';
            setTimeout(() => { btn.innerHTML = '✅ Registrar Venta'; btn.disabled = false; }, 2000);
        }

    } catch (err) {
        console.error('Error al registrar venta:', err);
        mostrarToast('❌ Error al guardar. Revisa la consola.');
        if (btn) { btn.innerHTML = '✅ Registrar Venta'; btn.disabled = false; }
    }
}

// =================================================================
// FIADOS — fiados.html
// =================================================================
let fiadoActivoId  = null;
let carritoFiado   = {};

async function iniciarPaginaFiados() {
    const sesion = protegerPagina();
    if (!sesion) return;

    const elNombre = document.getElementById('header-user-name');
    if (elNombre) elNombre.innerText = sesion.nombre;

    actualizarLabelsPrecio();
    await renderizarListaFiados();
}

// ---- Lista de fiados activos ----
async function renderizarListaFiados() {
    const lista = document.getElementById('lista-fiados');
    if (!lista) return;

    lista.innerHTML = '<div class="fiado-empty">Cargando cuentas...</div>';

    try {
        const db = getDb();
        const { data: rows, error } = await db
            .from('fiados')
            .select('id, nombre_cliente, total_productos, total_abonado')
            .eq('estado', 'activo')
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;

        // Actualizar chips
        const totalPendiente = (rows || []).reduce(
            (s, r) => s + ((r.total_productos || 0) - (r.total_abonado || 0)), 0
        );
        const elCuentas   = document.getElementById('chip-cuentas');
        const elPendiente = document.getElementById('chip-total-fiados');
        if (elCuentas)   elCuentas.innerText   = (rows || []).length;
        if (elPendiente) elPendiente.innerText  = `$${totalPendiente.toLocaleString('es-CO')}`;

        lista.innerHTML = '';

        if (!rows || rows.length === 0) {
            lista.innerHTML = '<div class="fiado-empty">No hay cuentas abiertas.<br>Crea una con el botón +</div>';
            return;
        }

        rows.forEach(f => {
            const saldo = (f.total_productos || 0) - (f.total_abonado || 0);
            // Escapar comillas en el nombre para usarlo en onclick
            const nombreSafe = f.nombre_cliente.replace(/'/g, "\\'");
            const card = document.createElement('div');
            card.className = 'fiado-card';
            card.innerHTML = `
                <div class="fiado-card-info" onclick="abrirFiado(${f.id}, '${nombreSafe}')">
                    <div class="fiado-avatar">${f.nombre_cliente.charAt(0).toUpperCase()}</div>
                    <div class="fiado-card-text">
                        <span class="fiado-nombre">${f.nombre_cliente}</span>
                        <span class="fiado-meta">Debe: $${saldo.toLocaleString('es-CO')}</span>
                    </div>
                    <div class="fiado-total-chip">$${(f.total_productos || 0).toLocaleString('es-CO')}</div>
                </div>
                <div class="fiado-card-actions">
                    <button class="btn-fiado-pagar"
                        onclick="cobrarFiado(${f.id}, '${nombreSafe}', ${saldo})">✅ Cobrar</button>
                    <button class="btn-fiado-delete"
                        onclick="eliminarFiado(${f.id}, '${nombreSafe}')">🗑️</button>
                </div>`;
            lista.appendChild(card);
        });

    } catch (err) {
        console.error('Error cargando fiados:', err);
        lista.innerHTML = '<div class="fiado-empty">❌ Error cargando cuentas. Reintenta.</div>';
    }
}

// ---- Crear nuevo fiado ----
async function abrirNuevoFiado() {
    const input  = document.getElementById('input-nombre-fiado');
    const nombre = input?.value.trim();
    if (!nombre) { sacudirInput('input-nombre-fiado'); return; }

    try {
        const db = getDb();
        const { data, error } = await db
            .from('fiados')
            .insert({
                nombre_cliente: nombre,
                total_productos: 0,
                total_abonado:   0,
                estado:          'activo'
            })
            .select('id')
            .single();

        if (error) throw error;
        if (input) input.value = '';
        await abrirFiado(data.id, nombre);

    } catch (err) {
        console.error('Error creando fiado:', err);
        mostrarToast('❌ No se pudo crear la cuenta');
    }
}

// ---- Abrir panel de detalle ----
async function abrirFiado(id, nombreCliente) {
    fiadoActivoId = id;
    carritoFiado  = {};

    document.getElementById('panel-lista').style.display   = 'none';
    document.getElementById('panel-detalle').style.display = 'flex';

    const elNombre = document.getElementById('fiado-detalle-nombre');
    const elAvatar = document.getElementById('fiado-detalle-avatar');
    if (elNombre) elNombre.innerText = nombreCliente;
    if (elAvatar) elAvatar.innerText = nombreCliente.charAt(0).toUpperCase();

    renderizarCarritoFiado();
    await renderizarItemsFiado();
}

function cerrarDetalleFiado() {
    carritoFiado  = {};
    fiadoActivoId = null;
    document.getElementById('panel-lista').style.display   = 'flex';
    document.getElementById('panel-detalle').style.display = 'none';
    renderizarListaFiados();
}

// ---- Mini-carrito temporal del fiado ----
function renderizarCarritoFiado() {
    const container = document.getElementById('fiado-carrito');
    if (!container) return;
    const llaves = Object.keys(carritoFiado);

    if (llaves.length === 0) {
        container.innerHTML = '<div class="empty-cart-msg">Toca un producto para agregarlo</div>';
        const el = document.getElementById('fiado-carrito-total');
        if (el) el.innerText = '$0';
        return;
    }

    container.innerHTML = '';
    let total = 0;
    llaves.forEach(id => {
        const item = carritoFiado[id];
        const sub  = item.precio * item.cantidad;
        total += sub;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="item-details">
                <span class="item-name">${item.nombre}</span>
                <span class="item-meta">${item.cantidad} × $${item.precio.toLocaleString('es-CO')}</span>
            </div>
            <span class="item-subtotal">$${sub.toLocaleString('es-CO')}</span>
            <button class="btn-delete-item" onclick="deleteFiadoCartItem('${id}')">🗑️</button>`;
        container.appendChild(div);
    });

    const elTotal = document.getElementById('fiado-carrito-total');
    if (elTotal) elTotal.innerText = `$${total.toLocaleString('es-CO')}`;
}

function deleteFiadoCartItem(id) {
    delete carritoFiado[id];
    renderizarCarritoFiado();
}

async function addProductToFiado(idProducto) {
    if (!fiadoActivoId) { mostrarToast('Abre una cuenta primero'); return; }

    const el        = document.getElementById(`fqty-${idProducto}`);
    const cantidad  = parseInt(el?.value) || 1;
    const estado    = fmtEstado[idProducto];
    const cfg       = FORMATO_CONFIG[idProducto];
    const defPrecio = PRODUCTOS_DB[idProducto].precio;

    let precioFinal = defPrecio;
    let nombreFinal = PRODUCTOS_DB[idProducto].nombre;

    if (cfg && estado && estado.mode !== 'unit') {
        const qtdPaq = (estado.mode === 'six')  ? 6
                     : (estado.mode === 'tray') ? 24
                     : (estado.mode === 'half') ? 7
                     : (estado.mode === 'box')  ? 13 : 1;
        const label  = (estado.mode === 'six')  ? 'Sixpack'
                     : (estado.mode === 'tray') ? 'Bandeja'
                     : (estado.mode === 'half') ? 'Med. Caja'
                     : 'Caja';
        nombreFinal = `${PRODUCTOS_DB[idProducto].nombre} (${label})`;
        precioFinal = estado.customPrice != null ? estado.customPrice : defPrecio * qtdPaq;
    }

    const card = document.getElementById(`card-${idProducto}`);
    if (card) card.classList.add('saving');

    try {
        const db       = getDb();
        const subtotal = precioFinal * cantidad;

        const { error: itemErr } = await db.from('fiado_items').insert({
            fiado_id:        fiadoActivoId,
            producto_nombre: nombreFinal,
            precio:          precioFinal,
            cantidad:        cantidad
        });
        if (itemErr) throw itemErr;

        const { data: fiadoActual, error: readErr } = await db
            .from('fiados').select('total_productos').eq('id', fiadoActivoId).single();
        if (readErr) throw readErr;

        const { error: updErr } = await db
            .from('fiados')
            .update({ total_productos: (fiadoActual.total_productos || 0) + subtotal })
            .eq('id', fiadoActivoId);
        if (updErr) throw updErr;

        if (el) el.value = 1;
        await renderizarItemsFiado();
        mostrarToast(`+ ${nombreFinal} x${cantidad}`);

    } catch (err) {
        console.error('Error guardando en fiado:', err);
        mostrarToast('Error al guardar. Reintenta.');
    } finally {
        if (card) card.classList.remove('saving');
    }
}

async function addCustomToFiado() {
    if (!fiadoActivoId) { mostrarToast('Abre una cuenta primero'); return; }

    const nameInput  = document.getElementById('fiado-custom-name');
    const priceInput = document.getElementById('fiado-custom-price');
    const qtyInput   = document.getElementById('fqty-custom');

    const nombre   = nameInput?.value.trim()     || 'Producto';
    const precio   = parseInt(priceInput?.value) || 0;
    const cantidad = parseInt(qtyInput?.value)   || 1;

    if (precio <= 0) { alert('Ingresa un precio valido.'); return; }
    if (!nombre)     { alert('Ingresa un nombre.'); return; }

    const btn = document.querySelector('.btn-custom-add');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

    try {
        const db       = getDb();
        const subtotal = precio * cantidad;

        const { error: itemErr } = await db.from('fiado_items').insert({
            fiado_id:        fiadoActivoId,
            producto_nombre: nombre,
            precio:          precio,
            cantidad:        cantidad
        });
        if (itemErr) throw itemErr;

        const { data: fiadoActual, error: readErr } = await db
            .from('fiados').select('total_productos').eq('id', fiadoActivoId).single();
        if (readErr) throw readErr;

        await db.from('fiados')
            .update({ total_productos: (fiadoActual.total_productos || 0) + subtotal })
            .eq('id', fiadoActivoId);

        if (nameInput)  nameInput.value  = '';
        if (priceInput) priceInput.value = '';
        if (qtyInput)   qtyInput.value   = 1;

        await renderizarItemsFiado();
        mostrarToast(`+ ${nombre} x${cantidad}`);

    } catch (err) {
        console.error('Error guardando producto manual:', err);
        mostrarToast('Error al guardar. Reintenta.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '+ Agregar'; }
    }
}


// ---- Confirmar y guardar carrito en el fiado ----
async function agregarCarritoAFiado() {
    if (!fiadoActivoId) return;
    const llaves = Object.keys(carritoFiado);
    if (llaves.length === 0) { alert('El pedido está vacío.'); return; }

    const btn = document.getElementById('btn-agregar-fiado');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando...'; }

    try {
        const db = getDb();

        const subtotalNuevo = llaves.reduce(
            (s, id) => s + carritoFiado[id].precio * carritoFiado[id].cantidad, 0
        );

        // 1. Insertar ítems en fiado_items
        const nuevosItems = llaves.map(id => ({
            fiado_id:        fiadoActivoId,
            producto_nombre: carritoFiado[id].nombre,
            precio:          carritoFiado[id].precio,
            cantidad:        carritoFiado[id].cantidad
        }));

        const { error: itemsErr } = await db.from('fiado_items').insert(nuevosItems);
        if (itemsErr) throw itemsErr;

        // 2. Leer total actual e incrementar
        const { data: fiadoActual, error: readErr } = await db
            .from('fiados')
            .select('total_productos')
            .eq('id', fiadoActivoId)
            .single();
        if (readErr) throw readErr;

        const { error: updErr } = await db
            .from('fiados')
            .update({ total_productos: (fiadoActual.total_productos || 0) + subtotalNuevo })
            .eq('id', fiadoActivoId);
        if (updErr) throw updErr;

        // 3. Limpiar carrito temporal y refrescar pantalla
        carritoFiado = {};
        renderizarCarritoFiado();
        await renderizarItemsFiado();
        mostrarToast('✅ Productos añadidos a la cuenta');

    } catch (err) {
        console.error('Error añadiendo a fiado:', err);
        mostrarToast('❌ Error al guardar. Reintenta.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '+ Añadir a la cuenta'; }
    }
}

// ---- Ítems acumulados del fiado activo ----
async function renderizarItemsFiado() {
    const container = document.getElementById('fiado-items-acumulados');
    if (!container || !fiadoActivoId) return;

    container.innerHTML = '<div class="fiado-empty-items">Cargando...</div>';

    try {
        const db = getDb();
        const [itemsRes, fiadoRes] = await Promise.all([
            db.from('fiado_items')
              .select('id, producto_nombre, precio, cantidad')
              .eq('fiado_id', fiadoActivoId)
              .order('id', { ascending: true }),
            db.from('fiados')
              .select('total_productos, total_abonado')
              .eq('id', fiadoActivoId)
              .single()
        ]);

        if (itemsRes.error) throw itemsRes.error;

        // Actualizar badge de saldo
        if (!fiadoRes.error && fiadoRes.data) {
            const saldo   = (fiadoRes.data.total_productos || 0) - (fiadoRes.data.total_abonado || 0);
            const elBadge = document.getElementById('fiado-total-acumulado');
            if (elBadge) elBadge.innerText = `$${saldo.toLocaleString('es-CO')}`;
        }

        container.innerHTML = '';
        const items = itemsRes.data || [];

        if (items.length === 0) {
            container.innerHTML = '<div class="fiado-empty-items">Sin pedidos aún</div>';
            return;
        }

        items.forEach(item => {
            const sub = item.precio * item.cantidad;
            const div = document.createElement('div');
            div.className = 'fiado-item-row';
            div.innerHTML = `
                <div class="fiado-item-info">
                    <span class="fiado-item-name">${item.producto_nombre}</span>
                    <span class="fiado-item-meta">${item.cantidad} × $${item.precio.toLocaleString('es-CO')}</span>
                </div>
                <span class="fiado-item-sub">$${sub.toLocaleString('es-CO')}</span>
                <button class="btn-delete-item"
                    onclick="eliminarItemFiado(${item.id}, ${sub})">🗑️</button>`;
            container.appendChild(div);
        });

    } catch (err) {
        console.error('Error cargando ítems del fiado:', err);
        container.innerHTML = '<div class="fiado-empty-items">❌ Error cargando productos</div>';
    }
}

// ---- Eliminar ítem individual del fiado ----
async function eliminarItemFiado(itemId, subtotalItem) {
    try {
        const db = getDb();

        const { error: delErr } = await db.from('fiado_items').delete().eq('id', itemId);
        if (delErr) throw delErr;

        const { data: fiadoActual, error: readErr } = await db
            .from('fiados').select('total_productos').eq('id', fiadoActivoId).single();
        if (readErr) throw readErr;

        const nuevoTotal = Math.max(0, (fiadoActual.total_productos || 0) - subtotalItem);
        const { error: updErr } = await db
            .from('fiados').update({ total_productos: nuevoTotal }).eq('id', fiadoActivoId);
        if (updErr) throw updErr;

        await renderizarItemsFiado();

    } catch (err) {
        console.error('Error eliminando ítem:', err);
        mostrarToast('❌ No se pudo eliminar el producto');
    }
}

// ---- Cobrar fiado ----
async function cobrarFiado(id, nombre, saldo) {
    if (!confirm(`¿Cobrar la cuenta de ${nombre} por $${Number(saldo).toLocaleString('es-CO')}?\n\nSe marcará como liquidada.`)) return;

    try {
        const db     = getDb();
        const sesion = obtenerSesion();

        // 1. Leer ítems del fiado
        const { data: items, error: itemsErr } = await db
            .from('fiado_items').select('*').eq('fiado_id', id);
        if (itemsErr) throw itemsErr;

        // 2. Crear la venta de cobro
        const { data: ventaData, error: ventaErr } = await db
            .from('ventas')
            .insert({
                total_venta:   saldo,
                metodo_pago:   'cobro_fiado',
                cajero_nombre: sesion?.nombre || 'Desconocido'
            })
            .select('id')
            .single();
        if (ventaErr) throw ventaErr;

        // 3. Insertar ítems en venta_items
        if (items && items.length > 0) {
            const ventaItems = items.map(i => ({
                venta_id:        ventaData.id,
                producto_nombre: `[Fiado] ${i.producto_nombre}`,
                precio:          i.precio,
                cantidad:        i.cantidad
            }));
            const { error: viErr } = await db.from('venta_items').insert(ventaItems);
            if (viErr) throw viErr;
        }

        // 4. Marcar fiado como liquidado
        const { error: updErr } = await db
            .from('fiados')
            .update({ estado: 'liquidado', total_abonado: saldo })
            .eq('id', id);
        if (updErr) throw updErr;

        if (fiadoActivoId === id) cerrarDetalleFiado();
        else await renderizarListaFiados();

        mostrarToast(`✅ Cuenta de ${nombre} cobrada y registrada`);

    } catch (err) {
        console.error('Error cobrando fiado:', err);
        mostrarToast('❌ Error al cobrar. Revisa la consola.');
    }
}

function cobrarFiadoActivo() {
    if (!fiadoActivoId) return;
    const nombre     = document.getElementById('fiado-detalle-nombre')?.innerText || '';
    const badgeTexto = document.getElementById('fiado-total-acumulado')?.innerText || '$0';
    const saldo      = parseInt(badgeTexto.replace(/\D/g, '')) || 0;
    cobrarFiado(fiadoActivoId, nombre, saldo);
}

// ---- Abono parcial ----
function abrirModalAbono() {
    if (!fiadoActivoId) return;
    const badgeTexto = document.getElementById('fiado-total-acumulado')?.innerText || '$0';
    const saldo      = parseInt(badgeTexto.replace(/\D/g, '')) || 0;
    const infoEl     = document.getElementById('abono-saldo-info');
    const inputEl    = document.getElementById('input-abono-monto');
    if (infoEl)  infoEl.innerText = `Saldo actual: $${saldo.toLocaleString('es-CO')}`;
    if (inputEl) inputEl.value = '';
    document.getElementById('modal-abono')?.classList.add('open');
    setTimeout(() => inputEl?.focus(), 150);
}

function cerrarModalAbono() {
    document.getElementById('modal-abono')?.classList.remove('open');
}

async function confirmarAbono() {
    const inputEl = document.getElementById('input-abono-monto');
    const monto   = parseInt(inputEl?.value);

    if (!monto || monto <= 0) {
        inputEl?.classList.add('shake');
        setTimeout(() => inputEl?.classList.remove('shake'), 400);
        return;
    }

    const badgeTexto = document.getElementById('fiado-total-acumulado')?.innerText || '$0';
    const saldoActual = parseInt(badgeTexto.replace(/\D/g, '')) || 0;

    if (monto > saldoActual) {
        alert(`❌ El abono ($${monto.toLocaleString('es-CO')}) no puede ser mayor al saldo ($${saldoActual.toLocaleString('es-CO')}).`);
        return;
    }

    cerrarModalAbono();

    try {
        const db     = getDb();
        const sesion = obtenerSesion();

        // 1. Leer total_abonado actual
        const { data: fiadoActual, error: readErr } = await db
            .from('fiados')
            .select('total_abonado, nombre_cliente')
            .eq('id', fiadoActivoId)
            .single();
        if (readErr) throw readErr;

        const nuevoAbonado = (fiadoActual.total_abonado || 0) + monto;

        // 2. Actualizar total_abonado
        const { error: updErr } = await db
            .from('fiados')
            .update({ total_abonado: nuevoAbonado })
            .eq('id', fiadoActivoId);
        if (updErr) throw updErr;

        // 3. Registrar el abono como venta parcial
        const { data: ventaData, error: ventaErr } = await db
            .from('ventas')
            .insert({
                total_venta:   monto,
                metodo_pago:   'abono_fiado',
                cajero_nombre: sesion?.nombre || 'Desconocido'
            })
            .select('id')
            .single();

        if (!ventaErr && ventaData) {
            await db.from('venta_items').insert({
                venta_id:        ventaData.id,
                producto_nombre: `[Abono] ${fiadoActual.nombre_cliente}`,
                precio:          monto,
                cantidad:        1
            });
        }

        // 4. Refrescar pantalla
        await renderizarItemsFiado();
        mostrarToast(`💵 Abono de $${monto.toLocaleString('es-CO')} registrado`);

    } catch (err) {
        console.error('Error registrando abono:', err);
        mostrarToast('❌ Error al registrar el abono');
    }
}

// ---- Eliminar fiado completo ----
async function eliminarFiado(id, nombre) {
    if (!confirm(`¿Eliminar la cuenta de ${nombre}?\nSe borrarán todos sus productos.`)) return;

    try {
        const db = getDb();
        await db.from('fiado_items').delete().eq('fiado_id', id);
        await db.from('fiados').delete().eq('id', id);
        await renderizarListaFiados();
        mostrarToast(`🗑️ Cuenta de ${nombre} eliminada`);
    } catch (err) {
        console.error('Error eliminando fiado:', err);
        mostrarToast('❌ Error al eliminar. Revisa la consola.');
    }
}

// ---- Steppers fiados ----
function stepFiadoQty(idProducto, cambio) {
    const el = document.getElementById(`fqty-${idProducto}`);
    if (!el) return;
    el.value = Math.max(1, (parseInt(el.value) || 1) + cambio);
}

// =================================================================
// RESUMEN — resumen.html
// =================================================================
async function iniciarPaginaResumen() {
    const sesion = protegerPagina();
    if (!sesion) return;

    const elFecha = document.getElementById('header-fecha');
    if (elFecha) {
        elFecha.innerText = new Date().toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    await renderizarResumen();

    // ---- Realtime: actualizar automáticamente cuando otra persona
    //               registra ventas, retiros o cobra fiados ----
    try {
        const db = getDb();
        db.channel('resumen-multiusuario')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' },
                () => renderizarResumen())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'retiros_caja' },
                () => renderizarResumen())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fiados' },
                () => renderizarResumen())
            .subscribe();
    } catch (e) {
        console.warn('Realtime no disponible, refrescando cada 30s:', e);
        // Fallback: refresco cada 30 segundos
        setInterval(() => renderizarResumen(), 30000);
    }
}

async function renderizarResumen() {
    try {
        const db = getDb();

        // ================================================================
        // 1. VENTAS EN CAJA — TODO el dinero real que entró:
        //    - 'efectivo': ventas normales de mostrador
        //    - 'cobro_fiado': fiados que el cliente pagó completo
        //    - 'abono_fiado': pagos parciales de fiados
        //    Lo que NO se incluye: los fiados ACTIVOS (están en tabla fiados)
        // ================================================================
        const { data: ventasData, error: ventasErr } = await db
            .from('ventas')
            .select('id, total_venta, metodo_pago');
        if (ventasErr) throw ventasErr;

        // Todas las filas de ventas son dinero real que entró a caja
        const todasVentas = ventasData || [];
        const totalVentas = todasVentas.reduce((s, v) => s + (v.total_venta || 0), 0);

        const elVentasTotal = document.getElementById('resumen-ventas-total');
        if (elVentasTotal) elVentasTotal.innerText = `$${totalVentas.toLocaleString('es-CO')}`;

        // ---- Detalle: TODOS los ítems vendidos en el turno (mostrador + fiados cobrados) ----
        // Usamos todos los IDs de ventas — así aparecen tanto las ventas normales
        // como los productos de fiados que se cobraron ([Fiado] Águila Botella, etc.)
        const listaVentas = document.getElementById('resumen-ventas-lista');
        const ventaIds    = todasVentas.map(v => v.id);

        if (ventaIds.length === 0) {
            if (listaVentas) listaVentas.innerHTML = '<div class="r-empty">Sin ventas registradas en este turno</div>';
        } else {
            // Consulta por lotes de 50 IDs para evitar límite de Supabase con .in()
            const BATCH = 50;
            let todosItems = [];
            for (let i = 0; i < ventaIds.length; i += BATCH) {
                const lote = ventaIds.slice(i, i + BATCH);
                const { data: batchItems, error: batchErr } = await db
                    .from('venta_items')
                    .select('producto_nombre, cantidad, precio')
                    .in('venta_id', lote);
                if (batchErr) throw batchErr;
                todosItems = todosItems.concat(batchItems || []);
            }

            // Limpiar el prefijo [Fiado] y [Abono] para mostrar el nombre limpio
            // y agrupar correctamente (ej: "[Fiado] Águila Botella" + "Águila Botella" = mismo producto)
            const consolidado = {};
            todosItems.forEach(i => {
                const nombreLimpio = i.producto_nombre
                    .replace(/^\[Fiado\]\s*/i, '')
                    .replace(/^\[Abono\]\s*/i, '')
                    .trim();
                if (!consolidado[nombreLimpio]) {
                    consolidado[nombreLimpio] = { cantidad: 0, subtotal: 0 };
                }
                consolidado[nombreLimpio].cantidad += i.cantidad;
                consolidado[nombreLimpio].subtotal  += i.precio * i.cantidad;
            });

            if (listaVentas) {
                listaVentas.innerHTML = '';
                const entradas = Object.entries(consolidado);
                if (entradas.length === 0) {
                    listaVentas.innerHTML = '<div class="r-empty">Sin detalle disponible</div>';
                } else {
                    // Ordenar por subtotal descendente (lo más vendido arriba)
                    entradas.sort((a, b) => b[1].subtotal - a[1].subtotal);
                    for (const [nombre, datos] of entradas) {
                        listaVentas.innerHTML += `
                            <div class="r-row">
                                <span class="r-nombre">${nombre}</span>
                                <span class="r-badge">×${datos.cantidad}</span>
                            </div>`;
                    }
                }
            }
        }

        // ================================================================
        // 2. RETIROS DE CAJA
        // ================================================================
        const { data: retirosData, error: retirosErr } = await db
            .from('retiros_caja')
            .select('monto, motivo, fecha')
            .order('fecha', { ascending: false });
        if (retirosErr) throw retirosErr;

        const retirosList  = retirosData || [];
        const totalRetiros = retirosList.reduce((s, r) => s + (r.monto || 0), 0);

        const elRetirosTotal = document.getElementById('resumen-retiros-total');
        const listaRetiros   = document.getElementById('resumen-retiros-lista');

        if (elRetirosTotal) elRetirosTotal.innerText = totalRetiros > 0
            ? `-$${totalRetiros.toLocaleString('es-CO')}` : '$0';

        if (listaRetiros) {
            if (retirosList.length === 0) {
                listaRetiros.innerHTML = '<div class="r-empty">Sin retiros este turno</div>';
            } else {
                listaRetiros.innerHTML = '';
                retirosList.forEach(r => {
                    const hora = new Date(r.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                    listaRetiros.innerHTML += `
                        <div class="r-row">
                            <span class="r-nombre">💸 ${r.motivo}</span>
                            <span class="r-badge red">-$${(r.monto || 0).toLocaleString('es-CO')} · ${hora}</span>
                        </div>`;
                });
            }
        }

        // ================================================================
        // 3. FIADOS ACTIVOS — informativo, NO se suma al total de caja
        //    porque el dinero no ha entrado todavía
        // ================================================================
        const { data: fiadosActivos, error: fiadosErr } = await db
            .from('fiados')
            .select('nombre_cliente, total_productos, total_abonado')
            .eq('estado', 'activo');
        if (fiadosErr) throw fiadosErr;

        const totalFiados   = (fiadosActivos || []).reduce(
            (s, f) => s + ((f.total_productos || 0) - (f.total_abonado || 0)), 0
        );
        const elFiadosTotal = document.getElementById('resumen-fiados-total');
        if (elFiadosTotal) elFiadosTotal.innerText = `$${totalFiados.toLocaleString('es-CO')}`;

        const listaFiados = document.getElementById('resumen-fiados-lista');
        if (listaFiados) {
            listaFiados.innerHTML = '';
            if (!fiadosActivos || fiadosActivos.length === 0) {
                listaFiados.innerHTML = '<div class="r-empty">Sin cuentas pendientes</div>';
            } else {
                fiadosActivos.forEach(f => {
                    const saldo = (f.total_productos || 0) - (f.total_abonado || 0);
                    listaFiados.innerHTML += `
                        <div class="r-row r-fiado-row">
                            <div class="r-fiado-left">
                                <span class="r-fiado-avatar">${f.nombre_cliente.charAt(0).toUpperCase()}</span>
                                <span class="r-nombre">${f.nombre_cliente}</span>
                            </div>
                            <span class="r-fiado-monto">$${saldo.toLocaleString('es-CO')}</span>
                        </div>`;
                });
            }
        }

        // ================================================================
        // 4. GRAN TOTAL — solo lo que realmente entró a caja:
        //    ventas de mostrador MENOS retiros.
        //    Los fiados se muestran aparte como "pendiente por cobrar".
        // ================================================================
        const granTotal   = totalVentas - totalRetiros;
        const elGranTotal = document.getElementById('resumen-gran-total');
        if (elGranTotal) elGranTotal.innerText = `$${Math.max(0, granTotal).toLocaleString('es-CO')}`;

        // Guardar para calcularCuadre y finalizarTurno
        window._resumenTotalVentas  = totalVentas;
        window._resumenTotalFiados  = totalFiados;
        window._resumenTotalRetiros = totalRetiros;

    } catch (err) {
        console.error('Error cargando resumen:', err);
        mostrarToast('❌ Error al cargar el resumen. Revisa la consola.');
    }
}

// ---- Cuadre de caja ----
function calcularCuadre() {
    // Base esperada = lo que entró a caja real (ventas + cobros de fiado) - retiros
    const totalVentas  = window._resumenTotalVentas  || 0;
    const totalRetiros = window._resumenTotalRetiros || 0;
    const baseEsperada = totalVentas - totalRetiros;

    const dineroFisico = parseInt(document.getElementById('input-dinero-fisico')?.value);
    const msg          = document.getElementById('mensaje-cuadre');
    if (!msg) return;

    if (isNaN(dineroFisico)) {
        msg.className = 'mensaje-cuadre-neutro';
        msg.innerText = totalRetiros > 0
            ? `Retiros descontados: -$${totalRetiros.toLocaleString('es-CO')}`
            : 'Ingresa el dinero contado para cuadrar';
        return;
    }

    const diff = dineroFisico - baseEsperada;
    if (diff === 0) {
        msg.className = 'mensaje-cuadre-ok';
        msg.innerText = '✅ Caja cuadrada perfectamente';
    } else if (diff > 0) {
        msg.className = 'mensaje-cuadre-ok';
        msg.innerText = `⚠️ Sobran $${diff.toLocaleString('es-CO')}`;
    } else {
        msg.className = 'mensaje-cuadre-error';
        msg.innerText = `❌ Faltan $${Math.abs(diff).toLocaleString('es-CO')}`;
    }
}

async function _obtenerTotalRetiros() {
    try {
        const db = getDb();
        // Consulta la suma de montos de la tabla retiros_caja
        const { data, error } = await db
            .from('retiros_caja')
            .select('monto');

        if (error) throw error;

        // Suma todos los montos obtenidos
        return data.reduce((suma, item) => suma + (item.monto || 0), 0);
    } catch (err) {
        console.error("Error al obtener retiros de la nube:", err);
        return 0; // Si falla, retorna 0 para no bloquear el sistema
    }
}

// ---- Cierre de turno → guarda cierre, borra ventas/retiros, nuevo turno ----
async function finalizarTurno() {
    const totalVentas    = window._resumenTotalVentas  || 0;
    const totalRetiros   = window._resumenTotalRetiros || 0;
    const totalFiados    = window._resumenTotalFiados  || 0;
    const efectivoEnCaja = totalVentas - totalRetiros;
    const sesion         = obtenerSesion();

    const efectivo   = parseInt(document.getElementById('input-dinero-fisico')?.value) || 0;
    const diferencia = efectivo - efectivoEnCaja;

    const retirosTxt = totalRetiros > 0 ? `\nRetiros: -$${totalRetiros.toLocaleString('es-CO')}` : '';
    const fiadosTxt  = totalFiados  > 0 ? `\nFiados pendientes (no incluidos): $${totalFiados.toLocaleString('es-CO')}` : '';

    if (!confirm(
        `¿Cerrar el turno?\n\n` +
        `Ventas en caja: $${totalVentas.toLocaleString('es-CO')}${retirosTxt}\n` +
        `Esperado en caja: $${efectivoEnCaja.toLocaleString('es-CO')}\n` +
        `Contado: $${efectivo.toLocaleString('es-CO')}\n` +
        `Diferencia: $${diferencia.toLocaleString('es-CO')}${fiadosTxt}\n\n` +
        `Se borrarán las ventas y retiros de este turno para iniciar uno nuevo.`
    )) return;

    const btn = document.querySelector('.btn-finalizar-turno');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Cerrando turno...'; }

    try {
        const db = getDb();

        // 1. Guardar el cierre en cierres_caja
        const { error: cierreErr } = await db.from('cierres_caja').insert({
            cajero_nombre:   sesion?.nombre || 'Desconocido',
            ventas_sistema:  totalVentas,
            efectivo_fisico: efectivo,
            diferencia
        });
        if (cierreErr) throw cierreErr;

        // 2. Obtener IDs de todas las ventas del turno para borrar sus ítems
        const { data: ventasIds, error: idsErr } = await db
            .from('ventas')
            .select('id');
        if (idsErr) throw idsErr;

        // 3. Borrar venta_items en lotes (evitar límite de Supabase)
        const ids = (ventasIds || []).map(v => v.id);
        const BATCH = 50;
        for (let i = 0; i < ids.length; i += BATCH) {
            const lote = ids.slice(i, i + BATCH);
            const { error: viErr } = await db
                .from('venta_items')
                .delete()
                .in('venta_id', lote);
            if (viErr) throw viErr;
        }

        // 4. Borrar todas las ventas del turno
        const { error: ventasErr } = await db
            .from('ventas')
            .delete()
            .neq('id', 0); // neq(0) = borrar todas las filas
        if (ventasErr) throw ventasErr;

        // 5. Borrar todos los retiros del turno
        const { error: retirosErr } = await db
            .from('retiros_caja')
            .delete()
            .neq('id', 0);
        if (retirosErr) throw retirosErr;

        // 6. Limpiar carrito local también
        localStorage.removeItem('licoclick_carrito');

        mostrarToast('✅ Turno cerrado · Nuevo turno iniciado');

        // Limpiar el input de efectivo y refrescar
        const inputEfectivo = document.getElementById('input-dinero-fisico');
        if (inputEfectivo) inputEfectivo.value = '';
        const msgCuadre = document.getElementById('mensaje-cuadre');
        if (msgCuadre) {
            msgCuadre.className = 'mensaje-cuadre-neutro';
            msgCuadre.innerText = 'Ingresa el dinero contado para cuadrar';
        }

        // Recargar resumen con datos en cero (nuevo turno)
        setTimeout(() => renderizarResumen(), 800);

    } catch (err) {
        console.error('Error en cierre de caja:', err);
        mostrarToast('❌ Error al cerrar turno. Revisa la consola.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '🔒 Cerrar Turno y Limpiar Ventas'; }
    }
}

// =================================================================
// UTILS COMPARTIDOS
// =================================================================
function mostrarToast(msg) {
    let t = document.getElementById('lc-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'lc-toast';
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
}

function sacudirInput(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
}

function handleLogout() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('licoclick_sesion');
        localStorage.removeItem('licoclick_carrito');
        window.location.replace('login.html');
    }
}