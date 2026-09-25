# Règles métier

Chaque règle a un identifiant stable, référencé dans la spec, le code et les tests. Les termes sont définis dans `glossary.md`.

## Arrondis

**R1.** Tout montant affiché ou calculé est exact au centime.

**R2.** Les budgets des enveloppes en pourcentage sont arrondis au centime inférieur. Les cibles des provisions sont arrondies au centime supérieur ; le recalcul mensuel (R18) absorbe l'écart au dernier mois.

## Mois

**R3.** Une dépense ou un versement est rattaché au mois budgétaire de sa date.

**R4.** Le revenu est affecté au mois pour lequel il est perçu, pas au mois de réception : un salaire versé fin octobre finance novembre. Un mois ne peut être ouvert que si le mois précédent est clôturé ou n'a jamais été ouvert.

**R5.** À l'ouverture, l'instantané fige pour le mois : le montant de chaque poste fixe, le mode et la valeur de chaque enveloppe variable, et la cible de chaque provision active.

**R6.** Un mois clôturé n'est plus modifiable, sauf après réouverture (R29).

## Paramétrage

**R7.** Une modification d'un poste fixe ou d'une enveloppe variable demande sa date d'effet : le mois en cours ou le mois suivant.
- Mois en cours : l'instantané du mois ouvert est recalculé.
- Mois suivant : le mois ouvert n'est pas touché.
- Les mois clôturés ne sont jamais affectés (R6).

**R8.** Supprimer un élément qui apparaît dans un mois existant l'archive au lieu de l'effacer. Un élément sans historique est réellement supprimé.

## Reste à vivre et enveloppes variables

**R9.** `reste à vivre = revenu du mois − Σ postes fixes`, charges et épargne programmée comprises. Les provisions ne sont pas déduites : leurs cibles sont des objectifs, financés par ce que l'utilisatrice parvient à mettre de côté.

**R10.** Une enveloppe en mode montant reçoit sa valeur telle quelle.

**R11.** `base de répartition = reste à vivre − Σ enveloppes en mode montant`.

**R12.** Une enveloppe en mode pourcentage reçoit `base de répartition × pourcentage`. La somme des pourcentages ne peut pas dépasser 100 %. La part restante est affichée comme non attribuée.

**R13.** Si la base de répartition est négative, les enveloppes en pourcentage valent 0 et l'écart est signalé.

**R14.** `marge prévisionnelle = reste à vivre − Σ budgets des enveloppes variables − Σ cibles des provisions`. Purement indicative : une marge négative déclenche un avertissement, jamais un blocage.

## Consommation des enveloppes variables

**R15.** `restant = budget − Σ dépenses du mois`. Le restant peut être négatif.

**R16.** Niveau d'alerte selon le taux de consommation (`consommé / budget`) :

| Taux | Niveau | Couleur |
|---|---|---|
| moins de 50 % | `ok` | vert |
| 50 à moins de 60 % | `watch` | vert-jaune |
| 60 à moins de 75 % | `caution` | jaune |
| 75 à moins de 85 % | `warning` | orange foncé |
| 85 à 100 % | `critical` | rouge |
| plus de 100 % | `exceeded` | violet |

Chaque niveau s'affiche avec un libellé ou une icône, jamais par la couleur seule.

## Provisions à échéance

**R17.** `mois d'échéance = mois de début + durée − 1`. La dépense prévue a lieu pendant le mois d'échéance.

**R18.** La cible du mois est calculée à l'ouverture (R5) :
`cible = (objectif − solde) / mois restants`, où les mois restants comptent le mois en cours et le mois d'échéance. Elle vaut 0 si le solde atteint l'objectif.

**R19.** Des versements du mois supérieurs à la cible produisent une avance, affichée en vert. La cible du mois en cours ne change pas ; l'avance est prise en compte à l'ouverture suivante via le solde.

**R20.** Une provision dont le mois d'échéance est clôturé sans qu'elle soit complète ni consommée passe en retard. Tant qu'elle est en retard, sa cible vaut le reste à constituer. Elle en sort si l'utilisatrice la prolonge, la consomme ou la clôture.

## Réserves

**R21.** `cible = min(mensualité, objectif − solde)`, et 0 si le solde atteint l'objectif. Une réserve n'a pas d'échéance et n'est jamais en retard.

## Consommation des provisions

**R22.** Une dépense sur une provision diminue son solde. Si elle dépasse le solde, le solde passe à 0 et l'excédent est enregistré comme financé par l'épargne. Un solde n'est jamais négatif. La date de la dépense est conservée comme date de consommation.

**R23.** Quand une dépense vide une provision à échéance, l'app propose :
- **Clôturer** : la provision disparaît des mois suivants.
- **Renouveler** : la provision est clôturée et un nouveau cycle démarre le mois suivant, avec le même objectif et la même durée.
- **Conserver** : la provision reste active avec un solde à 0, et son provisionnement reprend à l'ouverture suivante (R18, ou R20 si l'échéance est passée).

Une réserve vidée ne déclenche aucune question : elle se réalimente selon R21.

## Clôture du mois

**R24.** `reliquat = Σ restants des enveloppes variables`, restants négatifs compris.

**R25.** Le reliquat peut être réparti vers l'épargne ou vers des provisions. Une répartition vers une provision crée un versement daté du jour de la clôture. Si le total réparti dépasse le reliquat, un avertissement s'affiche sans bloquer.

**R26.** Une fois la répartition validée, le mois est clôturé (R6).

**R30.** Si le reliquat est négatif, son montant est enregistré comme financé par l'épargne pour le mois. Toute répartition déclenche alors l'avertissement de R25. En cas de réouverture puis de nouvelle clôture (R29), ce montant est recalculé.

## Pointage

**R27.** Chaque poste fixe d'un mois est programmé à l'ouverture et passe à effectué quand l'utilisatrice le pointe.

**R28.** Une provision est effectuée pour le mois quand les versements du mois atteignent sa cible.

## Réouverture

**R29.** Seul le dernier mois clôturé peut être rouvert, même si le mois suivant est déjà ouvert.
- Sont modifiables : le revenu, les dépenses, les versements et le pointage. L'instantané du mois n'est pas modifié par R7.
- La répartition du reliquat est conservée, puis revalidée à la nouvelle clôture, le reliquat ayant pu changer (R24, R25).
- Les instantanés des mois suivants ne sont pas modifiés : une correction qui change le solde d'une provision se répercute sur sa cible à la prochaine ouverture (R18).

## Exemples

Données de référence : revenu 2 800 € ; charges 1 400 € (loyer 1 000, internet 50, téléphone 20, salle 30, coaching 200, Netflix 20, mutuelle 35, transports 45) ; épargne programmée 400 € (assurance vie 100, livret A 300) ; Vie quotidienne 150 € ; Sorties et loisirs 15 % ; Achats plaisir 15 % ; Orthodontie à échéance, 400 € sur 6 mois ; Vacances à échéance, 700 € sur 10 mois ; Imprévus en réserve, plafond 250 €, mensualité 50 €.

| # | Règles | Situation | Résultat attendu |
|---|---|---|---|
| E1 | R9 | Ouverture du mois | Reste à vivre 1 000 € |
| E2 | R10, R11, R12 | Enveloppes | Base 850 € ; Sorties 127,50 € ; Plaisir 127,50 € ; non attribué 595 € |
| E3 | R18 | Cibles au premier mois | Orthodontie 66,67 € ; Vacances 70 € |
| E4 | R14 | Marge | 1 000 − 405 − 136,67 = 458,33 € |
| E5 | R19 | Versement de 100 € sur Orthodontie | Avance 33,33 € ; cible du mois inchangée |
| E6 | R18 | Mois suivant, solde 100 € | Cible Orthodontie = 300 / 5 = 60 € |
| E7 | R2, R18 | Versements exacts de 66,67 € pendant 5 mois | Cible du 6e mois = 66,65 € |
| E8 | R15, R16 | 100 € dépensés sur Plaisir | Taux 78,4 %, niveau `warning`, restant 27,50 € |
| E9 | R15, R16 | 140 € dépensés sur Plaisir | Niveau `exceeded`, restant −12,50 € |
| E10 | R22 | Imprévu de 300 € sur Imprévus, solde 250 € | Solde 0 € ; 50 € financés par l'épargne |
| E11 | R21 | Mois suivant | Cible Imprévus 50 € |
| E12 | R23 | Paiement de 400 € sur Orthodontie, solde 400 € | Solde 0 € ; choix clôturer / renouveler / conserver |
| E13 | R25 | Reliquat 150 €, répartition 225 € | Avertissement, clôture possible |
| E14 | R7 | Vie quotidienne passe à 180 € avec effet au mois suivant | Mois en cours inchangé ; mois suivant à 180 € |
| E15 | R29 | Octobre rouvert, novembre ouvert ; ajout d'un versement oublié de 30 € sur Vacances en octobre | Solde Vacances +30 € ; cible de novembre inchangée ; cible de décembre recalculée avec ce solde |
| E16 | R24, R30 | Clôture avec Sorties à −60 €, Plaisir à +20 €, Vie quotidienne à 0 € | Reliquat −40 € ; 40 € financés par l'épargne |
