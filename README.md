## Informations
Ce jeu est dédié et créé pour fonctionner sur la plateforme de mini-jeux en ligne Comus Party.  

Comus Party est une application de mini-jeux en ligne, elle est développée dans le cadre de la SAE 3.01 du BUT Informatique à l'IUT de Bayonne et du Pays Basque.

Ce jeu est un quiz de culture générale présentant différentes personnalités, que les joueurs doivent trouver. Au bout d'un certains nombre de manches, qui peut être définis par l'hôte de la partie, le joueur ayant le plus de points remporte la partie.

## Fonctionnement
Afin d'initialiser une partie, le serveur attend la réception d'une pré-requête, permettant ainsi de créer une nouvelle instance d'un quiz dans laquelle l'ensemble des joueurs est répertorié avec leur UUID.

Afin de se connecter au serveur de jeu, la requête doit être de la forme `/game/:gameCode/:playerUuid`. C'est ici que le serveur de jeu vérifie que la partie existe bien, et que le joueur est également répertorié dans celle-ci.

Une fois que le joueur est connecté, il peut envoyer des réponses aux questions posées par le serveur. Si la réponse est correcte, le joueur gagne un point, sinon il ne gagne rien.

À la fin de la partie, le serveur de jeu envoi une requête retournant les scores ainsi que le vainqueur de la partie.

## Informations techniques
Ce jeu est développé en JavaScript, et utilise la librairie Socket.io pour la communication entre le serveur et les clients.

Le serveur de jeu est développé en Node.js, et utilise Express pour la gestion des routes.

## Informations supplémentaires
Ce jeu est une première version, très simple afin de pouvoir réaliser un produit minimum viable pour la présentation de ntore projet lors des soutenances de fin de semestre. Il est donc possible que des bugs soient présents, et que des améliorations soient nécessaires.