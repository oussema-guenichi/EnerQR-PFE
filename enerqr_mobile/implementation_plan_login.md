# Plan d'Implémentation : Modification du Login et Correction du Dashboard Admin

Suite à votre demande, voici le plan pour ajouter la sélection de rôle à la connexion et réparer les statistiques du dashboard admin.

## User Review Required
Merci de lire les modifications proposées et de me donner le feu vert pour les exécuter.

## 1. Modifications Backend (`main.py` & `schemas.py`)
- **`schemas.py`** : Mise à jour du schéma `UserLogin` pour y inclure `role` (str) et `numero_serie` (optionnel).
- **`main.py`** (Route `/auth/login`) : 
  - Vérifier que le rôle soumis correspond au rôle de l'utilisateur dans la base de données.
  - Si le rôle sélectionné est **Admin**, exiger et vérifier le code secret ("ENERQR-ADMIN-2024").
  - Si le rôle sélectionné est **Technicien**, exiger et vérifier le numéro de série par rapport à celui enregistré en base.

## 2. Modifications Frontend Web (`AuthPage.jsx`)
- Rendre les boutons de sélection de rôle (Client / Technicien / Admin) visibles en mode "Se connecter" (login) et pas seulement en mode "S'inscrire".
- Rendre les champs de saisie du Code Admin et Numéro de série visibles lors du login.
- Envoyer ces champs supplémentaires au backend lors de l'appel API `/auth/login`.

## 3. Modifications Application Mobile (`login.dart` & `api_service.dart`)
- **`api_service.dart`** : Mettre à jour `ApiService.login` pour accepter `role` et `numero_serie` (ou admin_code) et les envoyer dans le body.
- **`login.dart`** : 
  - Afficher les pastilles de rôle (Client / Technicien / Admin) même lorsque `_isLoginMode` est `true`.
  - Afficher le champ "Code d'accès" / "Numéro de série" lors du login si Admin/Technicien est sélectionné.

## 4. Correction Dashboard Web Admin (`AdminDashboard.jsx`)
- **Problème identifié** : Les variables `filteredStats` et le compteur des anomalies semblent afficher "0" ou ne pas se recalculer correctement après le chargement asynchrone des données (`fetchData`).
- **Solution** : 
  - Sécuriser le calcul de `filteredStats` (utiliser `stats.total_clients` provenant de l'API `/admin/stats` plutôt que de recompter manuellement les éléments filtrés, ou s'assurer que le filtrage ne masque pas toutes les données par défaut).
  - Assurer que les KPI (Total Clients, Anomalies Actives) se mettent à jour dynamiquement et gèrent les cas où les données sont en cours de chargement.

## Verification Plan
1. **Backend** : Tester la route `/auth/login` avec Swagger UI pour vérifier les restrictions de code et rôle.
2. **Web** : Se connecter en tant qu'admin sur le site web. Vérifier que la connexion échoue si le code est faux.
3. **Web Admin** : Vérifier que les chiffres "Total Clients" et "Anomalies Actives" s'affichent correctement (ex: > 0) sur le Dashboard Admin Web.
4. **Mobile** : Lancer l'app Flutter, choisir le rôle "Admin", taper le code, et vérifier l'accès.
