BEGIN;
SET LOCAL search_path = agro, public;

-- Catálogos iniciales del prototipo local (29/10/2026), sin usuarios demo ni movimientos.

-- Reejecutable en mantenimiento controlado; no sobrescribe valores existentes.

-- UIT: valores observados en código, no certificación de vigencia normativa. Revisar al habilitar otro año.

INSERT INTO rol(nombre) VALUES ('Administrador'), ('Chofer') ON CONFLICT (nombre) DO NOTHING;

INSERT INTO norma(codigo,nombre) VALUES ('NOP','NOP'), ('RTPO','RTPO'), ('EU','EU'), ('ROC','ROC'), ('GLOBALGAP_GRASP','GLOBALG.A.P. / GRASP') ON CONFLICT (codigo) DO NOTHING;

INSERT INTO fruta(name) SELECT 'Mango' WHERE NOT EXISTS (SELECT 1 FROM fruta WHERE name='Mango');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Mango Kent', f.fruta_id FROM fruta f WHERE f.name='Mango' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Mango Kent');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Mango Edward', f.fruta_id FROM fruta f WHERE f.name='Mango' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Mango Edward');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Mango Haden', f.fruta_id FROM fruta f WHERE f.name='Mango' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Mango Haden');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Mango Tommy Atkins', f.fruta_id FROM fruta f WHERE f.name='Mango' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Mango Tommy Atkins');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Mango Ataulfo', f.fruta_id FROM fruta f WHERE f.name='Mango' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Mango Ataulfo');

INSERT INTO fruta(name) SELECT 'Palta' WHERE NOT EXISTS (SELECT 1 FROM fruta WHERE name='Palta');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Palta Hass', f.fruta_id FROM fruta f WHERE f.name='Palta' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Palta Hass');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Palta Fuerte', f.fruta_id FROM fruta f WHERE f.name='Palta' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Palta Fuerte');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Palta Zutano', f.fruta_id FROM fruta f WHERE f.name='Palta' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Palta Zutano');

INSERT INTO fruta(name) SELECT 'Arándano' WHERE NOT EXISTS (SELECT 1 FROM fruta WHERE name='Arándano');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Biloxi', f.fruta_id FROM fruta f WHERE f.name='Arándano' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Biloxi');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Ventura', f.fruta_id FROM fruta f WHERE f.name='Arándano' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Ventura');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Emerald', f.fruta_id FROM fruta f WHERE f.name='Arándano' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Emerald');

INSERT INTO fruta(name) SELECT 'Uva' WHERE NOT EXISTS (SELECT 1 FROM fruta WHERE name='Uva');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Red Globe', f.fruta_id FROM fruta f WHERE f.name='Uva' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Red Globe');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Crimson Seedless', f.fruta_id FROM fruta f WHERE f.name='Uva' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Crimson Seedless');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Sugraone', f.fruta_id FROM fruta f WHERE f.name='Uva' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Sugraone');

INSERT INTO fruta(name) SELECT 'Banano' WHERE NOT EXISTS (SELECT 1 FROM fruta WHERE name='Banano');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Cavendish', f.fruta_id FROM fruta f WHERE f.name='Banano' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Cavendish');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Orgánico', f.fruta_id FROM fruta f WHERE f.name='Banano' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Orgánico');

INSERT INTO fruta_derivada(name,fruta_id) SELECT 'Baby Banano', f.fruta_id FROM fruta f WHERE f.name='Banano' AND NOT EXISTS (SELECT 1 FROM fruta_derivada d WHERE d.fruta_id=f.fruta_id AND d.name='Baby Banano');

INSERT INTO parametro_uit(anio,valor,limite_uit,umbral_alerta) VALUES (2025,5350,75,0.90), (2026,5500,75,0.90) ON CONFLICT (anio) DO NOTHING;

-- guia_x_norma queda vacía: sus filas nacen de selecciones reales de cada guía, nunca de este seed.

COMMIT;
