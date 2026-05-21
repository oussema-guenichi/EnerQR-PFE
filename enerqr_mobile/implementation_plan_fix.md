# Plan de Restauration des Fonctionnalités (App Mobile)

Lors de la stricte refonte UI des écrans statiques, le routage interne des onglets (`activeTab`) de chaque dashboard n'a pas été défini pour afficher les bonnes listes, et certaines actions interactives n'ont pas été reconnectées. Ce plan détaille comment restaurer toutes ces fonctionnalités tout en conservant le design imposé.

## ⚠️ User Review Required
Merci de valider ce plan d'action. Si cela vous convient, donnez le feu vert et je procéderai aux corrections.

## Modifications Prévues (`unified_dashboard.dart`)

### 1. Routage Principal (Admin)
Au lieu d'afficher uniquement `_buildAdminDashboard()` (qui correspond à la vue "Vue d'ensemble"), je vais utiliser un `switch (activeTab)` pour l'Admin pour rendre les vues manquantes :
*   **Gestion Clients** (`clients`) : Créer `_buildAdminClientsList()` affichant une liste de cartes selon le nouveau design.
*   **Parc Machines** (`pumps`) : Créer `_buildAdminPumpsList()`.
*   **Équipe Technique** (`techniciens`) : Créer `_buildAdminTechsList()`.
*   **Suivi Anomalies** (`anomalies`) : Créer `_buildAdminAnomaliesList()`.
*   **Garanties & Fact.** (`garanties`) : Créer `_buildAdminGarantiesList()`.

### 2. Routage Secondaire (Technicien)
Dans `_buildTechnicianDashboard()`, je vais intégrer une condition `if (activeTab == 'anomalies')` pour afficher les données des anomalies, et `if (activeTab == 'my_clients')` pour afficher la liste des clients récupérée via `ApiService.getTechnicienClients()`.

### 3. Logique & Actions (Client)
*   **Assistant Intelligent (Chatbot)** : 
    *   Le champ de saisie actuel est purement décoratif. Je vais le rendre interactif à l'aide d'un `TextEditingController`.
    *   Mise en place d'une fonction `_sendMessageToAI()` qui appelera `ApiService.askAI()`.
    *   Ajout d'une gestion de l'état (liste de messages locaux) pour voir la réponse de l'IA s'afficher dans la bulle de chat.
*   **Téléchargement de facture** : 
    *   Le bouton "Download" est présent, mais il faut s'assurer que le lien configuré (ex: `launchUrl(...)`) pointe vers la route exacte du backend configuré (`${ApiService.baseUrl}/invoices/.../download`) et gère le consentement (pour OS).

## Open Questions
Aucune question ouverte. Les sous-vues seront recréées en respectant les bordures (0.5px `rgba(0,0,0,0.08)`), radius de 12px, et typographies (Outfit et Inter).

## Verification Plan
*   Tester chaque option du Drawer (Admin).
*   Cliquer sur l'onglet "Mes clients" (Technicien).
*   Écrire un message dans le bot IA et valider le format de l'URL pour la facture.
