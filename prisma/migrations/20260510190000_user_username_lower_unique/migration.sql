-- Un solo usuario por "nombre" ignorando mayúsculas (p. ej. Ranma vs ranma).
CREATE UNIQUE INDEX "User_username_lower_key" ON "User" (LOWER("username"));
