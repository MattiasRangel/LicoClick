# LicoClick - Sistema de Punto de Venta (POS)

**LicoClick** es una aplicación web de ventas, control de inventario y gestión de caja, diseñada específicamente para optimizar la operativa de negocios comerciales como licorerías. Su enfoque principal es ofrecer un control preciso sobre los turnos de trabajo, las finanzas diarias y las cuentas por cobrar, todo desde una interfaz optimizada tanto para computadoras de escritorio como para dispositivos móviles.

##Características Principales

*   **Gestión de Turnos Manuales:** Control absoluto sobre la apertura y cierre de caja. El sistema registra las operaciones por jornada de trabajo real, evitando descuadres por cambios de día a medianoche, ideal para negocios nocturnos.
*   **Registro de Ventas en Tiempo Real:** Procesamiento de carrito de compras, cálculo de totales y almacenamiento en base de datos.
*   **Módulo de Fiados (Cuentas por Cobrar):** Sistema integrado para registrar clientes con cuentas pendientes, agregarles productos a crédito, gestionar abonos parciales o totales y visualizar el saldo deudor actualizado.
*   **Control de Retiros de Caja:** Registro de salidas de dinero o pagos a proveedores durante el turno, afectando directamente el cálculo del cuadro de caja final.
*   **Cuadre de Caja Detallado:** Resumen automático al finalizar el turno que contrasta las ventas del sistema, los fiados, los retiros y el efectivo físico ingresado por el cajero, calculando diferencias exactas.
*   **Diseño 100% Responsivo:** Interfaz adaptada para su uso fluido en teléfonos móviles, garantizando que el personal pueda operar el sistema desde cualquier dispositivo en el local.

##Tecnologías Utilizadas

Este proyecto está construido utilizando tecnologías estándar de la web y servicios en la nube para garantizar rapidez y persistencia de datos:

*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla).
*   **Backend & Base de Datos (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL).
*   **Control de Versiones:** Git & GitHub.
*   **Almacenamiento Local:** Uso de `localStorage` para el manejo de sesiones de usuario y estados temporales de turno.

## Estructura del Proyecto

El flujo de la aplicación se divide principalmente en:
*   `index.html` / `login.html`: Autenticación y acceso del personal.
*   `script.js`: Lógica principal de ventas, carrito y cuadre de caja.
*   Funciones de base de datos conectadas a través de la API REST de Supabase para las tablas de: `ventas`, `venta_items`, `retiros_caja`, `fiados` y `cierres_caja`.
