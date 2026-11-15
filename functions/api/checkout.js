/* ALETHE — POST /api/checkout — stub: da collegare a Stripe Checkout al lancio.
   Quando pronto: creare sessione Stripe con price ID del piano PRO e restituire { url }. */
export async function onRequestPost() {
  return Response.json(
    { error: 'checkout_non_configurato', message: 'Stripe non ancora collegato: configurare STRIPE_SECRET_KEY e PRICE_ID come segreti Pages.' },
    { status: 501 }
  );
}
