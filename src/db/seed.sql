-- ============================================================
-- MEDIFOOD MediProd — Données initiales (seed)
-- ============================================================
USE mediprod;

-- Utilisateurs (mots de passe hashés avec bcrypt en prod — ici en clair pour seed)
-- Le script seed.js se charge du hashage bcrypt
-- Ce fichier est documentaire uniquement

-- Clients initiaux
INSERT INTO clients (id, client_number, name, company, phone, email, address, city, postal_code, matricule_fiscale, active) VALUES
('c1','0001','Hichem Mansouri','Carrefour Sfax','74 123 456','achats@carrefour-sfax.tn','Avenue Habib Bourguiba','Sfax','3000','0123456A/A/M/000',TRUE),
('c2','0002','Leila Ben Salah','Monoprix Tunis','71 987 654','l.bensalah@monoprix.tn','Rue de Marseille','Tunis','1000','0234567B/A/M/000',TRUE),
('c3','0003','Anis Khelifi','MG Distribution Sousse','73 555 222','anis@mg-dist.tn','Zone Industrielle','Sousse','4000','0345678C/A/M/000',TRUE),
('c4','0004','Sonia Gharbi','Géant Tunisia','71 444 333','s.gharbi@geant.tn','Lac 2, Berges du Lac','Tunis','1053','0456789D/A/M/000',TRUE),
('c5','0005','Fares Jebali','Délice Pâtisserie','74 666 111','contact@delice-patisserie.tn','Rue Mongi Slim','Sfax','3002',NULL,TRUE),
('c6','0006','Maher Boukadi','Aziza Supermarchés Monastir','73 333 999','achats@aziza.tn','Avenue de l''Environnement','Monastir','5000','0567890E/A/M/000',TRUE),
('c7','0007','Ines Lahmar','Marché Centrale Gabès','75 222 444','ines@centrale-gabes.tn','Rue 18 Janvier','Gabès','6000',NULL,TRUE),
('c8','0008','Walid Cherif','Magasin Général Tunis','71 888 222','w.cherif@mg.tn','Charguia 1','Tunis','2035','0678901F/A/M/000',FALSE);

-- Notifications initiales
INSERT INTO notifications (id, type, message, read_status, recipient_role) VALUES
('n1','stock_insuffisant','Stock Pistaches insuffisant (145 kg < seuil 150 kg). Réapprovisionnement requis.',FALSE,'Responsable Commercial'),
('n2','stock_insuffisant','Stock Fruits enrobés chocolat critique (95 kg < seuil 200 kg).',FALSE,'Responsable Commercial');
