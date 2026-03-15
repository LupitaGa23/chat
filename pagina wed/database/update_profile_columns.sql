ALTER TABLE usuarios ADD COLUMN username VARCHAR(60) NULL AFTER correo;
ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(30) NULL AFTER username;
UPDATE usuarios SET username = LOWER(REPLACE(CONCAT(nombre, '.', apellido_paterno), ' ', '')) WHERE username IS NULL OR username = '';
ALTER TABLE usuarios ADD UNIQUE INDEX idx_username_unique (username);
