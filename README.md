## Informations
Ce jeu est dédié et créé pour fonctionner sur la plateforme de mini-jeux en ligne Comus Party.  

Comus Party est une application de mini-jeux en ligne, elle est développée dans le cadre de la SAE 3.01 du BUT Informatique à l'IUT de Bayonne et du Pays Basque.

Ce jeu est un quiz de culture générale présentant différentes personnalités, que les joueurs doivent trouver. Au bout d'un certain nombre de manches, qui peut être définis par l'hôte de la partie, le joueur ayant le plus de points remporte la partie.

## Déroulé d'une partie
Lorsque l'hôte de la partie décidé de lancer la partie sur la plateforme Comus Party, un `<iframe>` est affiché sur l'écran de chacun de joueurs, affichant ainsi le serveur de jeu.

Le jeu affiche une image et les joueurs doivent deviner qui est la personnalité représentée sur l'image au bout d'un temps imparti. Ce temps peut être défini par l'hôte de partie et est par défaut de 30 secondes.

Si un joueur trouve la bonne réponse, il gagne un point. Si aucun joueur ne trouve la bonne réponse au bout du temps imparti, personne ne gagne de point.

Afin qu'une réponse soit valide, celle-ci doit contenir au moins le nom de famille de la personnalité. Dans le cas où plusieurs personnalités ont le même nom, la personnalité de "référence" prend la priorité sur cet usage unique du nom.  
*Exemple : Pour Brigitte Macron, seul "Macron" ne sera pas valide car la personnalité de "référence" est Emmanuel Macron.*

À la fin de la partie, le serveur de jeu affiche le classement final en prenant en compte plusieurs points :
- Si aucun joueur n'a marqué de point, il n'y a pas de vainqueur.
- Si un seul joueur a le score le plus élevé, il est le vainqueur.
- Si plusieurs joueurs ont le score le plus élevé *(exæquo)* ils sont tous vainqueurs.

*N.B : Le serveur de jeu renvoyant uniquement le tableau des scores avec le vainqueur "premier", Comus Party n'est pas exclu de pouvoir traiter ce tableau d'une manière qui lui convient mieux.*

## Informations techniques
Ce jeu est développé en JavaScript, et utilise la librairie Socket.io pour la communication entre le serveur et les clients.

Le serveur de jeu est développé en Node.js, et utilise Express pour la gestion des routes.

L'interface graphique est réalisée en HTML / CSS avec l'utilisation de la bibliothèque CSS TailwindCSS pour simplifier l'utilisation des classes dans le développement.

Afin d'initialiser une partie, le serveur attend la réception d'une pré-requête, permettant ainsi de créer une nouvelle instance d'un quiz dans laquelle l'ensemble des joueurs est répertorié avec leur UUID ainsi qu'un token généré aléatoirement *(ces tokens sont gérés entièrement par Comus Party)*.

Nous utilisons des tokens afin d'éviter tout vol d'identité durant une partie. Dans le cas où nous n'utiliserions pas ces tokens, il serait possible pour un joueur de se connecter à une partie sans y être invité en connaissant simplement l'UUID d'un autre joueur.

Afin de se connecter au serveur de jeu, la requête doit être de la forme `/game/:gameCode/:token`. C'est ici que le serveur de jeu vérifie que la partie existe bien, et que le joueur est également répertorié dans celle-ci.

Une fois que le joueur est connecté, il peut envoyer des réponses aux questions posées par le serveur. Si la réponse est correcte, le joueur gagne un point, sinon il ne gagne rien.

À la fin de la partie, le serveur de jeu envoi une requête retournant les scores ainsi que le(s) vainqueur(s) de la partie.

## Informations supplémentaires
Ce jeu est une première version, très simple afin de pouvoir réaliser un produit minimum viable pour la présentation de notre projet lors des soutenances de fin de semestre. Il est donc possible que des bugs soient présents, et que des améliorations soient nécessaires.