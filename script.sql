-- Crear base de datos
CREATE DATABASE IF NOT EXISTS BoutiqueAterciopelda;
USE BoutiqueAterciopelda;

-- Tipos de usuario
CREATE TABLE tblTiposUsuario (
    ID_TipoUsuario INT PRIMARY KEY AUTO_INCREMENT,
    Nombre_Tipo VARCHAR(20) NOT NULL CHECK (Nombre_Tipo IN ('Admin', 'Cliente'))
);

-- Usuarios
CREATE TABLE tblUsuarios (
    ID_Usuario INT PRIMARY KEY AUTO_INCREMENT,
    ID_TipoUsuario INT,
    Nombre VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Teléfono VARCHAR(15),
    Contrasena VARCHAR(255) NOT NULL,
    FOREIGN KEY (ID_TipoUsuario) REFERENCES tblTiposUsuario(ID_TipoUsuario)
);

-- Localidades
CREATE TABLE tblLocalidades (
    ID_Localidad INT PRIMARY KEY AUTO_INCREMENT,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion TEXT
);

-- Productos
CREATE TABLE tblProductos (
    ID_Producto INT PRIMARY KEY AUTO_INCREMENT,
    Nombre VARCHAR(100) NOT NULL,
    Descripción TEXT,
    ID_Localidad INT,
    TipoTela VARCHAR(50),
    InspiracionCultural TEXT,
    Imagen_URL VARCHAR(255),
    FOREIGN KEY (ID_Localidad) REFERENCES tblLocalidades(ID_Localidad)
);

-- Tallas
CREATE TABLE tblTallas (
    ID_Talla INT PRIMARY KEY AUTO_INCREMENT,
    Talla VARCHAR(10) NOT NULL UNIQUE
);

-- Producto-Tallas
CREATE TABLE tblProductoTallas (
    ID_Producto INT,
    ID_Talla INT,
    PRIMARY KEY (ID_Producto, ID_Talla),
    FOREIGN KEY (ID_Producto) REFERENCES tblProductos(ID_Producto),
    FOREIGN KEY (ID_Talla) REFERENCES tblTallas(ID_Talla)
);

-- Eventos
CREATE TABLE tblEventos (
    ID_Evento INT PRIMARY KEY AUTO_INCREMENT,
    Titulo VARCHAR(100) NOT NULL,
    Descripcion TEXT,
    Fecha DATE NOT NULL,
    Hora TIME NOT NULL,
    Ubicacion VARCHAR(100)
);

-- Fotos
CREATE TABLE tblFotos (
    ID_Foto INT PRIMARY KEY AUTO_INCREMENT,
    URL VARCHAR(255) NOT NULL,
    Título VARCHAR(100),
    Descripción TEXT,
    Fecha_Subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Videos
CREATE TABLE tblVideos (
    ID_Video INT PRIMARY KEY AUTO_INCREMENT,
    URL VARCHAR(255) NOT NULL,
    Título VARCHAR(100),
    Descripción TEXT,
    Fecha_Subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Información de empresa
CREATE TABLE tblInformacionEmpresa (
    ID_Informacion INT PRIMARY KEY AUTO_INCREMENT,
    Email VARCHAR(100) NOT NULL,
    Teléfono VARCHAR(15),
    Nombre_Contacto VARCHAR(100)
);

-- Colaboradores
CREATE TABLE tblColaboradores (
    ID_Colaborador INT PRIMARY KEY AUTO_INCREMENT,
    Nombre VARCHAR(100) NOT NULL,
    Rol VARCHAR(100)
);

-- Créditos
CREATE TABLE tblCreditos (
    ID_Credito INT PRIMARY KEY AUTO_INCREMENT,
    Nombre VARCHAR(100) NOT NULL,
    Tipo_Credito VARCHAR(50) NOT NULL
);

-- NUEVA: Servicios
CREATE TABLE tblServicio (
    ID_Servicio INT PRIMARY KEY AUTO_INCREMENT,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion TEXT,
    Precio DECIMAL(10,2),
    Duracion VARCHAR(50),
    Imagen_URL VARCHAR(255)
);

-- Índices
CREATE INDEX idx_tipos_usuario_nombre ON tblTiposUsuario(Nombre_Tipo);
CREATE INDEX idx_usuarios_email ON tblUsuarios(Email);
CREATE INDEX idx_productos_nombre ON tblProductos(Nombre);
CREATE INDEX idx_eventos_fecha ON tblEventos(Fecha);
CREATE INDEX idx_fotos_fecha ON tblFotos(Fecha_Subida);
CREATE INDEX idx_videos_fecha ON tblVideos(Fecha_Subida);
CREATE INDEX idx_empresa_email ON tblInformacionEmpresa(Email);
