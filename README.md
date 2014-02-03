Municipales 2014 - Comment va ma ville ?
==================

*Selon [un sondage réalisé par Harris][1], les 3 préoccupations majeures des Français à l'approche des élections municipales sont l'emploi, la sécurité et la maitrise des dépenses publiques. Comment se porte la France, et en particulier votre ville, sur ces 3 aspects ?*

***Comment va ma ville ?*** est un projet réalisé durant le [Hackathon Data+Municipales][2] organisé par l'[ESJ-Pro Paris][3]. Le projet a été réalisé par l'équipe "Team Caféine", et a été lauréat au terme du Hackathon.

L'application est disponible ici: http://teamcafeine.github.io/enjeux-municipales/app/

Conformément au réglement du Hackathon, le code source du projet est librement accessible et réutilisable sous **licence GPL v3**.

[Les données utilisées, ainsi que les API utilisées par l'application, sont disponibles ici.][4] Les jeux de données sont sous **[Licence Ouverte (Etalab)][5]**.

**La Team Caféine:**
@VincentLeble (Nouvelle République)
@CecileLG (Netvibes)
@remi_lejn (OpenDataSoft)
@benrict (OpenDataSoft)

#### Notes sur le code du projet

La structure de l'application est une page web utilisant [AngularJS][6] pour afficher les données sur une carte via [LeafletJS][7]. Les données sont stockées sur un espace de la plateforme [OpenDataSoft][8] avec une granularité à la commune, et consommées via une API fournissant des clusters basées sur un découpage régional/départemental/communal ainsi que l'agrégation des données numériques pour ce cluster (par exemple la moyenne du taux d'endettement pour la région/département/commune).
La qualité du code côté client est considérée comme "plus que perfectible" pour des raisons de "course contre la montre", dont on peut apprécier le paroxisme par la présence de styles CSS directement embarqués dans le HTML, et commités à 20 secondes de la fin du concours. Le code a été conservé tel quel, mais pourra éventuellement être nettoyé plus tard pour terminer la concrétisation de l'idée originale du projet.


  [1]: http://www.scribd.com/doc/132787422/Etude-Harris-Interactive-Les-Francais-et-les-municipales
  [2]: https://www.hackerleague.org/hackathons/hackathon-medias-data-plus-municipales
  [3]: http://esj-pro.fr/
  [4]: http://datamunicipales.opendatasoft.com/explore/
  [5]: http://wiki.data.gouv.fr/wiki/Licence_Ouverte_/_Open_Licence
  [6]: http://angularjs.org/
  [7]: http://leafletjs.com/
  [8]: http://www.opendatasoft.com/
