import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";

type TutorialStep = {
  title: string;
  description: string;
  body: string;
  link?: { href: string; label: string };
};

const STEPS: TutorialStep[] = [
  {
    title: "Poser le cadre dans les paramètres",
    description: "À faire une seule fois, ajustable ensuite.",
    body: "Commence par tes postes fixes (les montants qui reviennent chaque mois, comme un loyer ou un abonnement), puis tes enveloppes variables (les budgets que tu dépenses au fil du mois, comme les courses ou les sorties) avec un montant ou un pourcentage de ce qu'il te reste.",
    link: { href: "/settings/fixed-entries", label: "Ouvrir les paramètres" },
  },
  {
    title: "Créer tes catégories",
    description: "Aussi dans les paramètres, après tes enveloppes.",
    body: "Une catégorie décrit la nature d'une dépense (courses, transport, santé…) et sert à analyser où part ton argent, indépendamment de l'enveloppe. Donne-lui un nom et une couleur, et, si tu veux, une enveloppe proposée par défaut à la saisie.",
    link: { href: "/settings/categories", label: "Créer mes catégories" },
  },
  {
    title: "Ouvrir le mois",
    description: "Sur « Ce mois-ci ».",
    body: "Saisis le revenu du mois : l'app fige alors tes postes fixes, tes budgets d'enveloppes et les cibles de tes provisions. Modifier un paramètre plus tard te demandera s'il s'applique au mois en cours ou au suivant.",
    link: { href: "/", label: "Aller sur Ce mois-ci" },
  },
  {
    title: "Pointer les postes fixes",
    description: "Programmé, puis effectué.",
    body: "Chaque poste fixe démarre « programmé ». Coche-le quand le prélèvement est passé pour suivre ce qui reste à payer.",
  },
  {
    title: "Enregistrer tes opérations",
    description: "Le raccourci clavier N ouvre une nouvelle dépense.",
    body: "Une dépense s'impute à une enveloppe ou à une provision, avec une catégorie. Les remboursements et les entrées exceptionnelles (une prime, un cadeau reçu) s'ajoutent à ton reste à vivre. Un transfert vers l'épargne ou un versement sur provision le diminue.",
    link: { href: "/operations", label: "Voir les opérations" },
  },
  {
    title: "Suivre le reste à vivre",
    description: "Ce qui reste de ton revenu une fois les postes fixes déduits.",
    body: "Chaque enveloppe affiche sa consommation avec une couleur d'alerte : du vert sous 50 % jusqu'au violet quand le budget est dépassé. Un dépassement n'est jamais bloquant, il est juste signalé.",
  },
  {
    title: "Mettre de côté avec les provisions",
    description: "Pour les dépenses qui arrivent un jour.",
    body: "Une provision à échéance se constitue sur plusieurs mois pour une dépense datée, comme un voyage. Une réserve n'a pas d'échéance : elle se maintient à un plafond, par exemple pour les imprévus, et se réalimente après usage.",
    link: { href: "/provisions", label: "Voir les provisions" },
  },
  {
    title: "Clôturer le mois",
    description: "Une fois le mois terminé.",
    body: "Le reliquat des enveloppes se répartit vers l'épargne, une provision, une enveloppe du mois suivant, ou se reporte. Un mois clôturé n'est plus modifiable ; tu peux rouvrir le dernier si tu as oublié quelque chose.",
  },
  {
    title: "Relire avec l'historique et les statistiques",
    description: "Pour comprendre où va ton argent.",
    body: "L'historique garde chaque mois tel qu'il a été clôturé. Les statistiques ventilent tes dépenses par catégorie sur les 3, 6 ou 12 derniers mois.",
    link: { href: "/stats", label: "Voir les statistiques" },
  },
];

export default async function TutorialPage() {
  const { user } = await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-[34px] leading-tight">Bienvenue, {user.name}</h1>
        <p className="mt-1.5 max-w-prose text-muted-foreground">
          Pécule fonctionne par enveloppes : chaque mois, ton revenu finance d'abord tes postes
          fixes, puis des enveloppes de dépenses et des provisions. Voici le parcours d'un mois, de
          l'ouverture à la clôture. Tu peux revenir ici à tout moment avec le bouton d'aide du menu.
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {index + 1}. {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-start gap-3">
                <p className="max-w-prose">{step.body}</p>
                {step.link ? (
                  <Link
                    href={step.link.href}
                    prefetch={false}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {step.link.label}
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
