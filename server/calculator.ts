import type { Transaction, PortfolioResult } from "@shared/schema";
import { ASSET_TYPES } from "@shared/schema";

/**
 * Core Portfolio Calculation Engine
 * Implements TWR (Time-Weighted Return) and XIRR (Money-Weighted Return)
 * All calculations are deterministic and based on actual transaction data.
 */

// ─── XIRR Calculation (Newton-Raphson method) ───
function xirr(cashFlows: { date: Date; amount: number }[]): number | null {
  if (cashFlows.length < 2) return null;

  const days = cashFlows.map(cf => cf.date.getTime());
  const amounts = cashFlows.map(cf => cf.amount);
  const d0 = days[0];

  function npv(rate: number): number {
    let total = 0;
    for (let i = 0; i < amounts.length; i++) {
      const years = (days[i] - d0) / (365.25 * 86400000);
      total += amounts[i] / Math.pow(1 + rate, years);
    }
    return total;
  }

  function dnpv(rate: number): number {
    let total = 0;
    for (let i = 0; i < amounts.length; i++) {
      const years = (days[i] - d0) / (365.25 * 86400000);
      if (years === 0) continue;
      total -= (years * amounts[i]) / Math.pow(1 + rate, years + 1);
    }
    return total;
  }

  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(df) < 1e-10) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < 1e-7) return newRate;
    rate = newRate;
    if (rate < -0.99) rate = -0.5;
    if (rate > 10) rate = 5;
  }
  return isFinite(rate) ? rate : null;
}

// ─── TWR Calculation ───
function calculateTWR(periods: { startValue: number; endValue: number; cashFlow: number }[]): number {
  if (periods.length === 0) return 0;
  
  let product = 1;
  for (const p of periods) {
    const denominator = p.startValue + p.cashFlow;
    if (denominator === 0) continue;
    const periodReturn = p.endValue / denominator;
    product *= periodReturn;
  }
  return product - 1;
}

// ─── Portfolio Value at Date ───
function getPortfolioValueAtDate(
  txns: Transaction[],
  targetDate: string,
  currentPrices: Map<string, number>
): number {
  let cashBalance = 0;
  let holdings: Map<string, { quantity: number; assetType: string }> = new Map();

  const sortedTxns = txns
    .filter(t => t.date <= targetDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const tx of sortedTxns) {
    switch (tx.type) {
      case "cash_in":
        cashBalance += tx.amount;
        break;
      case "cash_out":
        cashBalance -= tx.amount;
        break;
      case "buy":
        cashBalance -= tx.amount;
        const buyKey = tx.assetTicker || tx.assetName || "unknown";
        const existing = holdings.get(buyKey) || { quantity: 0, assetType: tx.assetType || "other" };
        existing.quantity += (tx.quantity || 0);
        holdings.set(buyKey, existing);
        break;
      case "sell":
        cashBalance += tx.amount;
        const sellKey = tx.assetTicker || tx.assetName || "unknown";
        const held = holdings.get(sellKey);
        if (held) {
          held.quantity -= (tx.quantity || 0);
          if (held.quantity <= 0) holdings.delete(sellKey);
          else holdings.set(sellKey, held);
        }
        break;
    }
  }

  // Value of holdings at current prices
  let holdingsValue = 0;
  for (const [ticker, holding] of holdings) {
    const price = currentPrices.get(ticker) || 0;
    holdingsValue += holding.quantity * price;
  }

  return cashBalance + holdingsValue;
}

// ─── Main Calculate Function ───
export function calculatePortfolio(
  txns: Transaction[],
  currentPrices: Map<string, number>,
  startDate?: string,
  endDate?: string
): PortfolioResult {
  if (txns.length === 0) {
    return {
      totalInvested: 0,
      currentValue: 0,
      gainLoss: 0,
      percentReturn: 0,
      twr: 0,
      xirr: null,
      timeline: [],
      allocation: [],
      transactions: [],
    };
  }

  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  const effectiveStart = startDate || sorted[0].date;
  const effectiveEnd = endDate || new Date().toISOString().slice(0, 10);

  // Calculate total invested (net cash in)
  let totalInvested = 0;
  let totalWithdrawn = 0;
  for (const tx of sorted) {
    if (tx.date < effectiveStart || tx.date > effectiveEnd) continue;
    if (tx.type === "cash_in") totalInvested += tx.amount;
    if (tx.type === "cash_out") totalWithdrawn += tx.amount;
  }
  const netInvested = totalInvested - totalWithdrawn;

  // Current portfolio value
  const currentValue = getPortfolioValueAtDate(sorted, effectiveEnd, currentPrices);

  // Gain/Loss
  const gainLoss = currentValue - netInvested;
  const percentReturn = netInvested > 0 ? (gainLoss / netInvested) * 100 : 0;

  // Build timeline (monthly snapshots)
  const timeline: { date: string; value: number }[] = [];
  const start = new Date(effectiveStart);
  const end = new Date(effectiveEnd);
  let current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const value = getPortfolioValueAtDate(sorted, dateStr, currentPrices);
    timeline.push({ date: dateStr, value });
    current.setMonth(current.getMonth() + 1);
  }
  // Add final date
  const endStr = end.toISOString().slice(0, 10);
  if (!timeline.find(t => t.date === endStr)) {
    timeline.push({ date: endStr, value: currentValue });
  }

  // Build allocation
  const holdings: Map<string, { quantity: number; assetType: string; assetName: string }> = new Map();
  for (const tx of sorted.filter(t => t.date <= effectiveEnd)) {
    if (tx.type === "buy") {
      const key = tx.assetTicker || tx.assetName || "unknown";
      const existing = holdings.get(key) || { quantity: 0, assetType: tx.assetType || "other", assetName: tx.assetName || key };
      existing.quantity += (tx.quantity || 0);
      holdings.set(key, existing);
    } else if (tx.type === "sell") {
      const key = tx.assetTicker || tx.assetName || "unknown";
      const held = holdings.get(key);
      if (held) {
        held.quantity -= (tx.quantity || 0);
        if (held.quantity <= 0) holdings.delete(key);
      }
    }
  }

  const allocation: PortfolioResult["allocation"] = [];
  let totalAlloc = 0;
  for (const [ticker, holding] of holdings) {
    const price = currentPrices.get(ticker) || 0;
    const value = holding.quantity * price;
    totalAlloc += value;
    const atKey = holding.assetType as keyof typeof ASSET_TYPES;
    allocation.push({
      assetType: holding.assetType,
      label: ASSET_TYPES[atKey]?.label || holding.assetName,
      value,
      weight: 0, // calculated after
    });
  }
  for (const a of allocation) {
    a.weight = totalAlloc > 0 ? (a.value / totalAlloc) * 100 : 0;
  }

  // TWR calculation with monthly periods
  const twrPeriods: { startValue: number; endValue: number; cashFlow: number }[] = [];
  for (let i = 1; i < timeline.length; i++) {
    const prevDate = timeline[i - 1].date;
    const currDate = timeline[i].date;
    const cashFlowInPeriod = sorted
      .filter(t => t.date > prevDate && t.date <= currDate && (t.type === "cash_in" || t.type === "cash_out"))
      .reduce((sum, t) => sum + (t.type === "cash_in" ? t.amount : -t.amount), 0);
    twrPeriods.push({
      startValue: timeline[i - 1].value,
      endValue: timeline[i].value,
      cashFlow: cashFlowInPeriod,
    });
  }
  const twr = calculateTWR(twrPeriods);

  // XIRR calculation
  const xirrFlows: { date: Date; amount: number }[] = [];
  for (const tx of sorted) {
    if (tx.date < effectiveStart || tx.date > effectiveEnd) continue;
    if (tx.type === "cash_in") xirrFlows.push({ date: new Date(tx.date), amount: -tx.amount });
    if (tx.type === "cash_out") xirrFlows.push({ date: new Date(tx.date), amount: tx.amount });
  }
  // Add terminal value
  xirrFlows.push({ date: new Date(effectiveEnd), amount: currentValue });
  const xirrResult = xirr(xirrFlows);

  return {
    totalInvested: netInvested,
    currentValue,
    gainLoss,
    percentReturn,
    twr: twr * 100,
    xirr: xirrResult !== null ? xirrResult * 100 : null,
    timeline,
    allocation,
    transactions: sorted.filter(t => t.date >= effectiveStart && t.date <= effectiveEnd),
  };
}

// ─── Commentary Generator ───
import { THINKER_PERSONAS, type ThinkerCommentary } from "@shared/schema";

export function generateCommentary(result: PortfolioResult): ThinkerCommentary[] {
  const { percentReturn, allocation, twr, totalInvested, currentValue } = result;
  const isProfit = percentReturn > 0;
  const isHighReturn = Math.abs(percentReturn) > 20;
  const hasEquity = allocation.some(a => ["bist100", "nasdaq100", "ipo_tr"].includes(a.assetType));
  const hasCrypto = allocation.some(a => a.assetType === "crypto");
  const hasGold = allocation.some(a => a.assetType === "precious_metals");
  const hasBonds = allocation.some(a => ["bond", "bill", "sukuk"].includes(a.assetType));
  const diversified = allocation.length >= 3;
  const topHolding = allocation.sort((a, b) => b.weight - a.weight)[0];
  const concentrated = topHolding && topHolding.weight > 50;

  return THINKER_PERSONAS.map(persona => {
    let commentary = "";
    let sentiment: ThinkerCommentary["sentiment"] = "neutral";

    switch (persona.id) {
      case "keynes":
        if (isProfit) {
          commentary = `Portföyünüz %${percentReturn.toFixed(1)} getiri ile "hayvan ruhları"nın lehinize çalıştığını gösteriyor. ${hasEquity ? "Hisse senedi varlıkları, toplam talebin güçlü olduğu dönemlerde iyi performans gösterir." : "Ancak hisse senedi eksikliği, ekonomik toparlanma dönemlerinde sizi dezavantajlı bırakabilir."}`;
          sentiment = "bullish";
        } else {
          commentary = `%${Math.abs(percentReturn).toFixed(1)} kayıp, efektif talebin zayıfladığına işaret ediyor. ${hasBonds ? "Sabit getirili varlıklarınız bir tampon sağlıyor." : "Devlet tahvilleri gibi güvenli limanlara yönelmeyi düşünün."}`;
          sentiment = "cautious";
        }
        break;

      case "friedman":
        commentary = isProfit
          ? `%${percentReturn.toFixed(1)} getiri takdire şayan. ${diversified ? "Ancak unutmayın: enflasyon her zaman ve her yerde parasal bir olgudur. Reel getirinizi hesapladığınızdan emin olun." : "Serbest piyasa güçleri lehinize çalışıyor, ancak çeşitlendirme riski azaltır."}`
          : `Kayıplar, genellikle hükümet müdahalelerinin piyasa sinyallerini bozmasından kaynaklanır. ${hasCrypto ? "Kripto varlıklar, merkezi otorite dışında bir alternatif sunar." : "Paranızın satın alma gücünü koruyacak araçlara odaklanın."}`;
        sentiment = isProfit ? "bullish" : "cautious";
        break;

      case "graham":
        if (concentrated) {
          commentary = `Portföyünüzün %${topHolding.weight.toFixed(0)}'i tek bir varlıkta yoğunlaşmış. Bu, "güvenlik marjı" ilkesine aykırıdır. Akıllı yatırımcı, düşecek bir varlığa karşı korunmak için çeşitlendirir.`;
          sentiment = "cautious";
        } else if (isProfit) {
          commentary = `%${percentReturn.toFixed(1)} getiri sağlam bir başarı. ${hasEquity ? "Hisse senetlerinde önemli olan fiyat değil, içsel değerdir. Bay Piyasa'nın günlük ruh haline aldanmayın." : "Sabit getirili enstrümanlar güvenli bir liman sağlar, ancak hisse senetlerinin uzun vadeli getiri potansiyelini göz ardı etmeyin."}`;
          sentiment = "bullish";
        } else {
          commentary = `Kayıp dönemlerinde panik satışı yapmayın. Bay Piyasa'nın size sunduğu fiyat, işletmenin gerçek değerini yansıtmayabilir. Güvenlik marjınızı koruyun.`;
          sentiment = "neutral";
        }
        break;

      case "drucker":
        commentary = diversified
          ? `Portföy yönetiminiz, iyi bir işletme yönetimi gibi çeşitlendirilmiş. ${isProfit ? `%${percentReturn.toFixed(1)} getiri, doğru kaynaklara doğru tahsis yapıldığını gösteriyor.` : "Sonuçlar beklentilerin altında olsa da, hedeflerinizi gözden geçirip stratejinizi ayarlamanız yeterli."}`
          : `Peter Drucker olarak, "ölçemediğiniz şeyi yönetemezsiniz" derim. ${allocation.length < 2 ? "Tek bir varlık sınıfına bağımlılık, stratejik risk oluşturur." : "Varlık dağılımınızı düzenli olarak gözden geçirin."}`;
        sentiment = isProfit ? "bullish" : "neutral";
        break;

      case "schumpeter":
        commentary = hasCrypto || hasEquity
          ? `${hasCrypto ? "Kripto varlıklar" : "Hisse senetleri"}, yaratıcı yıkımın en görünür alanıdır. ${isProfit ? `%${percentReturn.toFixed(1)} getiri, inovasyonun yarattığı değeri yakaladığınızı gösteriyor.` : "Geçici kayıplar, yeni paradigmaların doğum sancılarıdır."}`
          : `Portföyünüzde inovasyon odaklı varlıklar eksik. Yaratıcı yıkım, kapitalizmin motorudur — teknoloji ve yenilikçi şirketlere yatırım, uzun vadede büyümenin anahtarıdır.`;
        sentiment = hasCrypto || hasEquity ? (isProfit ? "bullish" : "neutral") : "cautious";
        break;

      case "fisher":
        commentary = `${isProfit ? "Pozitif getiri sevindirici" : "Negatif getiri endişe verici"}, ancak asıl soru şu: Reel satın alma gücünüz arttı mı? ${hasBonds ? "Tahvil pozisyonlarınız faiz oranı riskine maruz." : ""} ${hasGold ? "Altın, tarihsel olarak satın alma gücünü korur." : "Portföyünüzde enflasyon koruması sağlayacak bir araç düşünün."}`;
        sentiment = hasGold ? "neutral" : "cautious";
        break;

      case "kostolany":
        if (isHighReturn && isProfit) {
          commentary = `%${percentReturn.toFixed(1)} — harika! Ama unutmayın: borsa bir köpektir, ekonomi ise sahibi. Köpek bazen çok önde koşar, bazen geri kalır, ama sonunda her zaman sahibine döner. Aşırı iyimserlik zamanı dikkatli olun.`;
          sentiment = "cautious";
        } else if (!isProfit) {
          commentary = `Kayıplar acı verir, ama en büyük başarılar en büyük paniklerden doğar. Panik sırasında al, öfori sırasında sat. Siz spekülator olun, kumarbaz değil.`;
          sentiment = "bullish";
        } else {
          commentary = `Istikrarlı bir portföy. Bir yatırımcı olarak sabır en büyük erdemdir. Borsanın zaman zaman ayılacağını bilin, ama trend sizin yanınızda olsun.`;
          sentiment = "neutral";
        }
        break;

      case "templeton":
        commentary = diversified
          ? `Küresel çeşitlendirme, en iyi koruma kalkanıdır. ${allocation.some(a => ["nasdaq100", "fx"].includes(a.assetType)) ? "Uluslararası pozisyonlarınız akıllıca." : "Yalnız yerel piyasalara odaklanmak fırsatları kaçırmaktır."} ${isProfit ? `%${percentReturn.toFixed(1)} getiri, doğru yoldasınız.` : "Maksimum karamsarlık, en iyi alım zamanıdır."}`
          : `Sir John Templeton olarak şunu söylerim: "Dünyanın en tehlikeli dört kelimesi: bu sefer farklı." Yerel piyasanın ötesine bakın, sınır ötesi fırsatlar sizi bekliyor.`;
        sentiment = isProfit ? "bullish" : "neutral";
        break;

      case "bagehot":
        commentary = hasBonds
          ? `Sabit getirili varlıklarınız, Lombard Caddesi ilkelerine uygun. ${isProfit ? "Kredi piyasalarında istikrar, portföyünüze güç katıyor." : "Ancak faiz oranı değişimleri tahvil değerlerini olumsuz etkileyebilir."} Merkez bankası politikalarını yakından takip edin.`
          : `Portföyünüzde sabit getirili enstrüman eksikliği dikkat çekici. Para piyasaları ve tahviller, finansal sistemin omurgasıdır — her portföyde yer bulmalıdır.`;
        sentiment = hasBonds ? "neutral" : "cautious";
        break;

      case "kindleberger":
        if (isHighReturn && isProfit) {
          commentary = `%${percentReturn.toFixed(1)} getiri etkileyici, ancak finansal krizler bir kalıp izler: mani, panik, çöküş. Yüksek getiri dönemlerinde, baloncuğun neresinde olduğunuzu sorun. Tarih, aşırı iyimserliğin bedelini her zaman ödetmiştir.`;
          sentiment = "bearish";
        } else if (!isProfit) {
          commentary = `Kayıplar, piyasa düzeltmesinin bir parçası olabilir. Kindleberger olarak hatırlatırım: her krizin ardından toparlanma gelir, ancak bu süreç sabır gerektirir. Hegemonik istikrar, uzun vadeli yatırımcıyı ödüllendirir.`;
          sentiment = "neutral";
        } else {
          commentary = `Orta düzey getiri, istikrarlı bir ekonomik ortamı yansıtıyor. Ancak küresel finansal istikrar kırılgandır — portföyünüzde kriz senaryolarına karşı koruma bulundurun.`;
          sentiment = "cautious";
        }
        break;
    }

    return { thinkerId: persona.id, name: persona.name, era: persona.era, commentary, sentiment };
  });
}
