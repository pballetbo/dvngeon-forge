-- (DCL) Creació de la base de dades i de l'usuari amb privilegis
CREATE DATABASE IF NOT EXISTS dvngeon_forge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dvngeon_forge;
CREATE USER 'pol' @'localhost' IDENTIFIED BY 'pol';
GRANT SELECT,
    INSERT,
    UPDATE,
    DELETE ON dvngeon_forge.* TO 'pol' @'localhost';
FLUSH PRIVILEGES;
-- (DDL) Creació de les taules
CREATE TABLE Usuari (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),
    data_registre DATETIME DEFAULT CURRENT_TIMESTAMP,
    rol ENUM('jugador', 'gamemaster')
);
CREATE TABLE Joc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom ENUM(
        'D&D',
        'Aquelarre',
        'La Crida de Cthulhu',
        'Pathfinder',
        "L'anell Únic",
        'Vampir'
    ) UNIQUE NOT NULL
);
CREATE TABLE EstilJoc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom ENUM(
        'Narratiu',
        'Simulacionista',
        'Desafiant',
        'Anàrquic',
        'Equilibrat',
        'Sandbox',
        'Director de teatre',
        'Colaborador',
        'Métodic',
        'Cercabregues'
    ) UNIQUE NOT NULL
);
CREATE TABLE Experiencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nivell ENUM(
        'Novell',
        'Intermig',
        'Competent',
        'Avançat',
        'Mestre'
    ) UNIQUE NOT NULL
);
CREATE TABLE Modalitat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom ENUM('online', 'presencial') UNIQUE NOT NULL
);
CREATE TABLE Duracio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sessions ENUM(
        'Oneshot',
        'Campanya curta',
        'Campanya mitja',
        'Campanya llarga',
        'Campanya oberta',
        'West marches'
    ) UNIQUE NOT NULL
);
CREATE TABLE Perfil (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuari_id INT UNIQUE,
    experiencia_id INT,
    avatar VARCHAR(255),
    descripcio VARCHAR(255),
    ciutat VARCHAR(100),
    FOREIGN KEY (usuari_id) REFERENCES Usuari(id),
    FOREIGN KEY (experiencia_id) REFERENCES Experiencia(id)
);
CREATE TABLE Perfil_Joc (
    perfil_id INT,
    joc_id INT,
    PRIMARY KEY (perfil_id, joc_id),
    FOREIGN KEY (perfil_id) REFERENCES Perfil(id),
    FOREIGN KEY (joc_id) REFERENCES Joc(id)
);
CREATE TABLE Perfil_Estil (
    perfil_id INT,
    estil_id INT,
    PRIMARY KEY (perfil_id, estil_id),
    FOREIGN KEY (perfil_id) REFERENCES Perfil(id),
    FOREIGN KEY (estil_id) REFERENCES EstilJoc(id)
);
CREATE TABLE Perfil_Modalitat (
    perfil_id INT,
    modalitat_id INT,
    PRIMARY KEY (perfil_id, modalitat_id),
    FOREIGN KEY (perfil_id) REFERENCES Perfil(id),
    FOREIGN KEY (modalitat_id) REFERENCES Modalitat(id)
);
CREATE TABLE Partida (
    id INT AUTO_INCREMENT PRIMARY KEY,
    creador_id INT,
    joc_id INT,
    modalitat_id INT,
    ubicacio VARCHAR(255),
    duracio_id INT,
    max_jugadors INT,
    estat ENUM('oberta', 'en_curs', 'tancada') DEFAULT 'oberta' NOT NULL,
    descripcio VARCHAR(255),
    data_partida DATETIME,
    data_creacio DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creador_id) REFERENCES Usuari(id),
    FOREIGN KEY (joc_id) REFERENCES Joc(id),
    FOREIGN KEY (modalitat_id) REFERENCES Modalitat(id),
    FOREIGN KEY (duracio_id) REFERENCES Duracio(id)
);
CREATE TABLE Solicitut (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jugador_id INT,
    partida_id INT,
    estat ENUM('pendent', 'acceptat', 'rebutjat', 'expulsat') DEFAULT 'pendent' NOT NULL,
    data_solicitut DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jugador_id) REFERENCES Usuari(id),
    FOREIGN KEY (partida_id) REFERENCES Partida(id),
    UNIQUE (jugador_id, partida_id)
);
CREATE TABLE Chat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partida_id INT,
    nom VARCHAR(100),
    FOREIGN KEY (partida_id) REFERENCES Partida(id)
);
CREATE TABLE Missatge (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remitent_id INT,
    destinatari_id INT,
    contingut TEXT,
    data_enviament DATETIME DEFAULT CURRENT_TIMESTAMP,
    partida_id INT NULL,
    FOREIGN KEY (remitent_id) REFERENCES Usuari(id),
    FOREIGN KEY (destinatari_id) REFERENCES Usuari(id),
    FOREIGN KEY (partida_id) REFERENCES Partida(id)
);
CREATE TABLE Chat_Missatge (
    id INT AUTO_INCREMENT PRIMARY KEY,
    remitent_id INT,
    chat_id INT,
    contingut TEXT,
    data_enviament DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (remitent_id) REFERENCES Usuari(id),
    FOREIGN KEY (chat_id) REFERENCES Chat(id)
);
-- (DML) Inserció de dades a les taules estàtiques
INSERT INTO Joc (nom)
VALUES ('D&D'),
    ('Aquelarre'),
    ('La Crida de Cthulhu'),
    ('Pathfinder'),
    ('L''anell Únic'),
    ('Vampir');
INSERT INTO EstilJoc (nom)
VALUES ('Narratiu'),
    ('Simulacionista'),
    ('Desafiant'),
    ('Anàrquic'),
    ('Equilibrat'),
    ('Sandbox'),
    ('Director de teatre'),
    ('Colaborador'),
    ('Métodic'),
    ('Cercabregues');
INSERT INTO Experiencia (nivell)
VALUES ('Novell'),
    ('Intermig'),
    ('Competent'),
    ('Avançat'),
    ('Mestre');
INSERT INTO Modalitat (nom)
VALUES ('online'),
    ('presencial');
INSERT INTO Duracio (sessions)
VALUES ('Oneshot'),
    ('Campanya curta'),
    ('Campanya mitja'),
    ('Campanya llarga'),
    ('Campanya oberta'),
    ('West marches');
