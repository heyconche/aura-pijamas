// api/checkout.js — Vercel Serverless Function
// Deploy: vercel.com → importe seu repositório GitHub → pronto
//
// Variáveis de ambiente necessárias (Vercel Dashboard → Settings → Environment Variables):
//   PAGARME_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXX   (chave secreta do Pagar.me)
//   PAGARME_PUBLIC_KEY=pk_test_XXXXXXXXXXXXXXXX   (chave pública do Pagar.me)

export default async function handler(req, res) {
  // CORS — permite chamadas do seu domínio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método não permitido' });

  const secretKey = process.env.PAGARME_SECRET_KEY;
  if (!secretKey) return res.status(500).json({ message: 'Chave de API não configurada' });

  try {
    const body = req.body;
    const { payment_method, amount, installments, customer, billing, card, items, coupon } = body;

    // Monta o payload para a API v5 do Pagar.me
    const pagarmePayload = {
      items: items.map(i => ({
        amount: i.unit_price,
        description: i.title,
        quantity: i.quantity,
        code: i.id,
      })),
      customer: {
        name: customer.name,
        email: customer.email,
        document: customer.document,
        document_type: 'CPF',
        type: 'individual',
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: customer.phone.slice(0, 2),
            number: customer.phone.slice(2),
          },
        },
      },
      shipping: {
        amount: amount >= 25000 ? 0 : 2500, // Frete grátis acima de R$250
        description: 'Entrega padrão',
        address: {
          line_1: `${billing.street_number}, ${billing.street}`,
          line_2: billing.complementary || '',
          neighborhood: billing.neighborhood,
          city: billing.city,
          state: billing.state,
          country: 'BR',
          zip_code: billing.zipcode,
        },
      },
      payments: [],
      metadata: {
        coupon: coupon || null,
        source: 'aura-pijamas-site',
      },
    };

    // ── CARTÃO DE CRÉDITO ───────────────────────────────────────────────────
    if (payment_method === 'card') {
      pagarmePayload.payments.push({
        payment_method: 'credit_card',
        credit_card: {
          installments: installments || 1,
          statement_descriptor: 'AURA PIJAMAS',
          card: {
            number: card.number,
            holder_name: card.holder_name,
            exp_month: parseInt(card.exp_month),
            exp_year: parseInt(card.exp_year),
            cvv: card.cvv,
            billing_address: {
              line_1: `${billing.street_number}, ${billing.street}`,
              neighborhood: billing.neighborhood,
              city: billing.city,
              state: billing.state,
              country: 'BR',
              zip_code: billing.zipcode,
            },
          },
        },
        amount,
      });
    }

    // ── PIX ────────────────────────────────────────────────────────────────
    if (payment_method === 'pix') {
      pagarmePayload.payments.push({
        payment_method: 'pix',
        pix: {
          expires_in: 1800, // 30 minutos
          additional_information: [
            { name: 'Loja', value: 'Aura Pijamas' },
          ],
        },
        amount,
      });
    }

    // ── BOLETO ─────────────────────────────────────────────────────────────
    if (payment_method === 'boleto') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // Vence em 3 dias

      pagarmePayload.payments.push({
        payment_method: 'boleto',
        boleto: {
          interest: { days: 1, type: 'percentage', amount: 1 },
          fine: { days: 2, type: 'percentage', amount: 2 },
          max_days_to_pay_past_due: 15,
          due_at: dueDate.toISOString(),
          instructions: 'Não receber após o vencimento.\nAura Pijamas - Obrigada pela compra!',
          billing_address: {
            line_1: `${billing.street_number}, ${billing.street}`,
            neighborhood: billing.neighborhood,
            city: billing.city,
            state: billing.state,
            country: 'BR',
            zip_code: billing.zipcode,
          },
        },
        amount,
      });
    }

    // ── CHAMADA À API DO PAGAR.ME ──────────────────────────────────────────
    const pagarmeRes = await fetch('https://api.pagar.me/core/v5/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pagarmePayload),
    });

    const order = await pagarmeRes.json();

    if (!pagarmeRes.ok) {
      console.error('Pagar.me error:', order);
      return res.status(400).json({
        message: order.message || 'Erro ao processar pagamento',
        errors: order.errors || [],
      });
    }

    // ── MONTA RESPOSTA PARA O FRONTEND ─────────────────────────────────────
    const response = {
      id: order.id,
      status: order.status,
      payment_method,
    };

    // Devolve dados do Pix se necessário
    if (payment_method === 'pix') {
      const pixCharge = order.charges?.[0];
      response.pix = {
        qr_code: pixCharge?.last_transaction?.qr_code || '',
        qr_code_url: pixCharge?.last_transaction?.qr_code_url || '',
        expires_at: pixCharge?.last_transaction?.expires_at || '',
      };
    }

    // Devolve URL do boleto se necessário
    if (payment_method === 'boleto') {
      const boletoCharge = order.charges?.[0];
      response.boleto_url = boletoCharge?.last_transaction?.url || '';
      response.boleto_barcode = boletoCharge?.last_transaction?.line || '';
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ message: 'Erro interno. Tente novamente.' });
  }
}
