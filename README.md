# Ciber CEI POS — Backend

API REST desarrollada con **Node.js**, **Express**, **TypeScript** y **MongoDB** (**Mongoose**) para dar soporte de persistencia y lógica de negocio al sistema de Punto de Venta (**Ciber CEI POS**), incluyendo autenticación mediante **JWT** y manejo de sesión por cookies.

## Módulos y funcionalidades

* **Autenticación y sesión:** emisión y verificación de tokens **JWT** con manejo de sesión mediante cookies HTTP-only y control de acceso para los módulos del POS.
* **Catálogo y stock (`Producto`):** gestión de artículos y servicios con persistencia de precios, costo de compra (`precioCompra`) y stock disponible.
* **Ventas (`Venta`):** registro y consulta de ventas con el detalle de ítems, cantidades, precios de venta y costo (`precioCompra`) para el cálculo de utilidad neta.
* **Arqueo de caja:** registro, consulta y cierre de movimientos de caja por jornada.
* **Rutas sincronizadas:** endpoints alineados con el frontend (`ciber-cei-post`) para operar de forma continua con la base de datos.

## Stack tecnológico

* **Node.js** + **Express**
* **TypeScript**
* **MongoDB** + **Mongoose**
* **JWT** + **Cookies**
* **pnpm**

## Configuración del entorno

Creá un archivo `.env` en la raíz del proyecto con las variables necesarias (puerto, conexión a MongoDB, secretos de JWT y configuración de cookies):

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/ciber-cei-pos
JWT_SECRET=tu_secreto_jwt
COOKIE_SECRET=tu_secreto_cookie