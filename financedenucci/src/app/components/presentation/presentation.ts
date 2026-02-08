import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables, ChartDataLabels);

interface ConfigData {
  adm: number;
  fr: number;
  prazo: number;
  incc: number;
  invest100k: number;
  jurosBanco: number;
  cdi: number;
}

interface InquilinoData {
  investido: number;
  patrimonio: number;
  renda: number;
  sobra: number;
}

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presentation.html',
  styleUrls: ['./presentation.scss']
})
export class Presentation implements OnInit, AfterViewInit {
  @ViewChild('chartCenario') chartCenarioCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartComparativo') chartComparativoCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartEquity') chartEquityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartSpread') chartSpreadCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartGlobalInquilinos') chartGlobalInquilinosCanvas!: ElementRef<HTMLCanvasElement>;

  // State
  showSplash = true;
  activeSection = 'home';
  activeSubTab = 'tab_analise';
  currentTheme = 'dark';

  // Chart instances
  chartCenarioInstance: Chart | null = null;
  chartComparativoInstance: Chart | null = null;
  chartEquityInstance: Chart | null = null;
  chartSpreadInstance: Chart | null = null;
  chartGlobalInquilinosInstance: Chart | null = null;

  // Calculator Forms
  cl_credito = '';
  cl_prazo = 200;
  cl_tipo = 'livre';
  cl_lance_pct = '';
  cl_results_visible = false;

  inv_credito = '';
  inv_meses = 0;
  inv_agio = '';
  liquidez_results_visible = false;

  eq_credito = '';
  eq_meses = 0;
  equity_results_visible = false;
  compare_taxas_visible = false;
  card_grafico_eq_visible = false;
  card_spread_visual_visible = false;

  pf_investido = '';
  pf_rentabilidade = '';
  pf_aporte = '';
  pf_renda = '';
  pf_custo = '';
  pf_imoveis = '';
  perfil_result_visible = false;

  ap_reserva = '';
  ap_aporte = '';
  ap_anos = 0;
  ap_taxa = '';
  ap_result_visible = false;

  pi_aporte = '';
  pi_anos = 15;
  pi_val = '';
  pi_rent = '';
  pi_result_visible = false;
  pi_table_rows: any[] = [];

  // Modals
  showModalResumo = false;
  showModalConfig = false;

  // Config
  cfg_taxa_adm = '';
  cfg_fundo_reserva = '';
  cfg_prazo = 200;
  cfg_incc = '';
  cfg_invest_100k = '';
  cfg_juros_banco = '';
  cfg_cdi = '';

  // Inquilinos
  inquilinoCount = 0;
  dadosInquilinos: (InquilinoData | null)[] = [];
  inquilinos: any[] = [];
  global_chart_visible = false;

  // Report fields
  client_name = '';
  consultant_name = '';
  company_name = '';

  // Expanded content flags
  expandedContent: { [key: string]: boolean } = {};

  // Revealed scenarios
  revealedScenarios: { [key: string]: boolean } = {};

  CONFIG_DEFAULT: ConfigData = {
    adm: 24.00,
    fr: 1.00,
    prazo: 200,
    incc: 7.00,
    invest100k: 333.40,
    jurosBanco: 1.50,
    cdi: 1.00
  };
window: any;

// Calculator Results (add these after your form variables)
cl_results = {
  creditoLiquido: 0,
  custoMensal: '0,00% a.m.',
  valorLance: 'R$ 0,00',
  amortizacao: 'R$ 0,00',
  parcelaAtual: 'R$ 0,00',
  parcelaPos: 'R$ 0,00',
  obsParcela: '',
  obsCredito: ''
};

inv_results = {
  parcelaInicial: 0,
  totalInvestido: 0,
  creditoCorrigido: 0,
  valorVenda: 0,
  lucroLiquido: 0,
  roiTotal: '0,00%',
  roiMensal: '0,00% a.m.'
};

eq_results = {
  parcelaMeia: 0,
  totalAcumulado: 0,
  parcelaCheia: 0,
  creditoFuturo: 0,
  custoConsorcio: '0,00% a.m.'
};

pf_results = {
  strategyTitle: '',
  strategyDesc: '',
  sugestao: 0,
  credito: 0
};

ap_results = {
  capital: 0,
  renda: 0
};

pi_results = {
  totalPatrimonio: 0,
  totalAluguel: 0
};

  ngOnInit() {
    this.carregarConfiguracoes();
    Chart.defaults.font.family = "'Montserrat', sans-serif";
    Chart.defaults.color = '#666';

    setTimeout(() => {
      this.dismissSplash()
    }, 1000)

     // Set initial theme
  document.documentElement.setAttribute('data-theme', this.currentTheme);
  
  Chart.defaults.font.family = "'Montserrat', sans-serif";
  Chart.defaults.color = '#666';
  Chart.defaults.borderColor = '#333';
  }

  
  ngAfterViewInit() {
    // Charts will be initialized when sections are shown
  }

  dismissSplash() {
    this.showSplash = false;
  }

    toggleTheme() {
      const html = document.documentElement;
  
  if (this.currentTheme === 'dark') {
    this.currentTheme = 'light';
    html.setAttribute('data-theme', 'light');
    Chart.defaults.color = '#4B5563';
    Chart.defaults.borderColor = '#E5E7EB';
  } else {
    this.currentTheme = 'dark';
    html.setAttribute('data-theme', 'dark');
    Chart.defaults.color = '#666';
    Chart.defaults.borderColor = '#333';
  }

  // Save theme preference
  localStorage.setItem('theme', this.currentTheme);

  // Update all charts
  this.chartCenarioInstance?.update();
  this.chartComparativoInstance?.update();
  this.chartEquityInstance?.update();
  this.chartSpreadInstance?.update();
  this.chartGlobalInquilinosInstance?.update();
    }

  showSection(sectionId: string) {
    this.activeSection = sectionId;
    
    if (sectionId === 'alavancagem' && this.inquilinoCount === 0) {
      this.adicionarInquilino();
    }
    
    if (sectionId === 'cenario') {
      setTimeout(() => this.initChartCenario(), 100);
    }
  }

  toggleContent(id: string) {
    if (id === 'vol_reveal') {
      this.expandedContent[id] = true;
      this.expandedContent['vol_hint'] = false;
      return;
    }
    this.expandedContent[id] = !this.expandedContent[id];
  }

  switchSubTab(tabId: string) {
    this.activeSubTab = tabId;
  }

  // Utility Functions
  formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatPercent(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  formatarMoedaInput(event: any) {
    let v = event.target.value.replace(/\D/g, '');
    v = (parseFloat(v) / 100).toFixed(2);
    v = v.replace('.', ',');
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    event.target.value = 'R$ ' + v;
  }

  formatarDecimalInput(event: any) {
    let v = event.target.value.replace(/[^\d,]/g, '');
    const parts = v.split(',');
    if (parts.length > 2) {
      v = parts[0] + ',' + parts.slice(1).join('');
    }
    event.target.value = v;
  }

  parseMoneyInput(value: string): number {
    if (!value) return 0;
    const val = value.replace(/[^\d,]/g, '');
    return parseFloat(val.replace(',', '.')) || 0;
  }

  parsePercentInput(value: string): number {
    if (!value) return 0;
    const val = value.replace(',', '.');
    return parseFloat(val) || 0;
  }

  // Configuration Management
  carregarConfiguracoes() {
    const saved = localStorage.getItem('ademicon_config');
    const config = saved ? JSON.parse(saved) : this.CONFIG_DEFAULT;
    
    this.cfg_taxa_adm = config.adm.toFixed(2).replace('.', ',');
    this.cfg_fundo_reserva = config.fr.toFixed(2).replace('.', ',');
    this.cfg_prazo = config.prazo;
    this.cfg_incc = config.incc.toFixed(2).replace('.', ',');
    this.cfg_invest_100k = 'R$ ' + config.invest100k.toFixed(2).replace('.', ',');
    this.cfg_juros_banco = config.jurosBanco.toFixed(2).replace('.', ',');
    this.cfg_cdi = config.cdi.toFixed(2).replace('.', ',');
  }

  salvarConfiguracoes() {
    const config: ConfigData = {
      adm: this.parsePercentInput(this.cfg_taxa_adm),
      fr: this.parsePercentInput(this.cfg_fundo_reserva),
      prazo: this.cfg_prazo,
      incc: this.parsePercentInput(this.cfg_incc),
      invest100k: this.parseMoneyInput(this.cfg_invest_100k),
      jurosBanco: this.parsePercentInput(this.cfg_juros_banco),
      cdi: this.parsePercentInput(this.cfg_cdi)
    };
    localStorage.setItem('ademicon_config', JSON.stringify(config));
    this.showModalConfig = false;
    alert('Configurações salvas! Recalcule os cenários para ver a alteração.');
  }

  getCfg(key: keyof ConfigData): number {
    const saved = localStorage.getItem('ademicon_config');
    const config = saved ? JSON.parse(saved) : this.CONFIG_DEFAULT;
    return config[key];
  }

  // Chart Creation
  createGradient(ctx: CanvasRenderingContext2D, color: string) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    return gradient;
  }

  initChartCenario() {
    if (!this.chartCenarioCanvas) return;
    const ctx = this.chartCenarioCanvas.nativeElement.getContext('2d')!;
    
    const gradGreen = this.createGradient(ctx, 'rgba(16, 185, 129, 0.9)');
    const gradGold = this.createGradient(ctx, 'rgba(212, 175, 55, 0.9)');
    const gradRed = this.createGradient(ctx, 'rgba(239, 68, 68, 0.9)');

    if (this.chartCenarioInstance) this.chartCenarioInstance.destroy();
    
    this.chartCenarioInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ademicon', 'Descapitalização', 'Financiamento'],
        datasets: [{
          label: 'Taxa Mensal',
          data: [0, 0, 0],
          backgroundColor: [gradGreen, gradGold, gradRed],
          borderRadius: 6,
          barThickness: 50
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { display: false, suggestedMax: 2.5 },
          x: {
            ticks: { color: '#fff', font: { size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  revealCenario(type: string) {
    this.revealedScenarios[type] = true;
    if (!this.chartCenarioInstance) return;
    
    const data = this.chartCenarioInstance.data.datasets[0].data as number[];
    
    if (type === 'avista') data[1] = this.getCfg('cdi');
    if (type === 'banco') data[2] = this.getCfg('jurosBanco') + 0.3;
    if (type === 'ademicon') data[0] = 0.12;
    
    this.chartCenarioInstance.update();
  }

  // Calculator Functions
  calcularParcelaSmart(creditoInicial: number, mesesDecorridos: number): number {
    const prazoTotal = 220;
    const taxaAdm = 0.24;
    const incc = 0.07;
    const fatorMeiaParcela = 0.003334;
    
    let saldoDevedorTotal = creditoInicial * (1 + taxaAdm);
    let creditoBase = creditoInicial;
    let totalPagoNominal = 0;
    let saldoDevedorAtual = saldoDevedorTotal;
    
    for (let m = 1; m <= mesesDecorridos; m++) {
      if (m > 1 && (m - 1) % 12 === 0) {
        creditoBase *= (1 + incc);
        saldoDevedorAtual *= (1 + incc);
      }
      const parcelaPaga = creditoBase * fatorMeiaParcela;
      totalPagoNominal += parcelaPaga;
    }
    
    const saldoRemanescente = saldoDevedorAtual - totalPagoNominal;
    let prazoRestante = prazoTotal - mesesDecorridos;
    if (prazoRestante <= 0) prazoRestante = 1;
    
    return saldoRemanescente / prazoRestante;
  }

  calcLances() {
    const credito = this.parseMoneyInput(this.cl_credito);
    const prazoTotal = this.cl_prazo;
    const pctLance = this.parsePercentInput(this.cl_lance_pct);
    const tipo = this.cl_tipo;
  
    if (credito === 0) return;
  
    const valorLance = credito * (pctLance / 100);
    const taxaTotalPct = 26.0;
    const custoTotalReais = credito * (taxaTotalPct / 100);
    const saldoDevedorTotal = credito + custoTotalReais;
    const parcelaOriginal = saldoDevedorTotal / prazoTotal;
  
    let creditoLiquido = 0;
    let parcelaPos = 0;
    let obsParcela = '';
    let obsCredito = '';
  
    if (tipo === 'embutido') {
      creditoLiquido = credito - valorLance;
      const saldoDevedorPos = saldoDevedorTotal - valorLance;
      parcelaPos = saldoDevedorPos / prazoTotal;
      obsParcela = '*Amortização de Parcela (Diluição)';
      obsCredito = '*O valor do lance foi descontado da carta. (Menor Liquidez)';
    } else {
      creditoLiquido = credito;
      parcelaPos = parcelaOriginal;
      obsParcela = '*Amortização de Prazo (Parcela Mantida)';
      obsCredito = '*Lance pago com recursos próprios. Crédito integral disponível.';
    }
  
    const taxaEfetivaTotal = (custoTotalReais / creditoLiquido) * 100;
    const taxaEfetivaMensal = taxaEfetivaTotal / prazoTotal;
  
    // Update component results
    this.cl_results = {
      creditoLiquido,
      custoMensal: taxaEfetivaMensal.toFixed(4).replace('.', ',') + '% a.m.',
      valorLance: this.formatBRL(valorLance),
      amortizacao: this.formatBRL(valorLance),
      parcelaAtual: this.formatBRL(parcelaOriginal),
      parcelaPos: this.formatBRL(parcelaPos),
      obsParcela,
      obsCredito
    };
  
    this.cl_results_visible = true;
  }

  calcInvestimento() {
    const creditoInicial = this.parseMoneyInput(this.inv_credito);
    const mesesAteContemplacao = this.inv_meses;
    const agioPct = this.parsePercentInput(this.inv_agio);
    
    if (creditoInicial === 0 || mesesAteContemplacao === 0) return;
  
    const inccAnual = this.getCfg('incc') / 100;
    const custo100k = this.getCfg('invest100k');
    const fatorMeiaParcela = custo100k / 100000;
    const cdiMensal = this.getCfg('cdi') / 100;
  
    const anosDecimais = mesesAteContemplacao / 12;
    const creditoCorrigido = creditoInicial * Math.pow((1 + inccAnual), anosDecimais);
  
    let totalInvestido = 0;
    let parcelaAtual = creditoInicial * fatorMeiaParcela;
    const labelsMeses: number[] = [];
    const dataCDI: number[] = [];
    let saldoCDI = 0;
  
    for (let m = 1; m <= mesesAteContemplacao; m++) {
      if (m > 1 && (m - 1) % 12 === 0) parcelaAtual *= (1 + inccAnual);
      totalInvestido += parcelaAtual;
      saldoCDI = saldoCDI * (1 + cdiMensal) + parcelaAtual;
      labelsMeses.push(m);
      dataCDI.push(saldoCDI);
    }
  
    const valorVendaCashIn = creditoCorrigido * (agioPct / 100);
    const lucroLiquido = valorVendaCashIn - totalInvestido;
    const roiTotal = (lucroLiquido / totalInvestido) * 100;
    const roiMensalSimples = roiTotal / mesesAteContemplacao;
    const parcelaInicial = creditoInicial * fatorMeiaParcela;
  
    // Update component results
    this.inv_results = {
      parcelaInicial,
      totalInvestido,
      creditoCorrigido,
      valorVenda: valorVendaCashIn,
      lucroLiquido,
      roiTotal: roiTotal.toFixed(2).replace('.', ',') + '%',
      roiMensal: roiMensalSimples.toFixed(2).replace('.', ',') + '% a.m.'
    };
  
    this.liquidez_results_visible = true;
  
    // Create chart (rest of the chart code...)
  }

  calcEquity() {
    const credito = this.parseMoneyInput(this.eq_credito);
    const mesContemplacao = this.eq_meses;
    
    if (credito === 0 || mesContemplacao === 0) return;

    const prazoTotal = this.getCfg('prazo');
    const taxaAdmTotal = this.getCfg('adm') + this.getCfg('fr');
    const incc = this.getCfg('incc') / 100;
    const custo100k = this.getCfg('invest100k');
    const fatorMeiaParcela = custo100k / 100000;

    let mesesUso = prazoTotal - mesContemplacao;
    if (mesesUso < 1) mesesUso = 1;
    const custoMensalDinamico = taxaAdmTotal / mesesUso;

    const valorMeiaParcela = credito * fatorMeiaParcela;
    const valorParcelaCheia = this.calcularParcelaSmart(credito, mesContemplacao);

    const anos = mesContemplacao / 12;
    const creditoFuturo = credito * Math.pow(1 + incc, anos);

    let acumuladoPre = 0;
    let parcelaAtualLoop = valorMeiaParcela;

    for (let m = 1; m <= mesContemplacao; m++) {
      if (m > 1 && (m - 1) % 12 === 0) parcelaAtualLoop *= (1 + incc);
      acumuladoPre += parcelaAtualLoop;
    }

    this.equity_results_visible = true;
    this.compare_taxas_visible = true;
    this.card_grafico_eq_visible = true;
    this.card_spread_visual_visible = true;

    // Store results
    this.eq_results = {
      parcelaMeia: valorMeiaParcela,
      totalAcumulado: acumuladoPre,
      parcelaCheia: valorParcelaCheia,
      creditoFuturo,
      custoConsorcio: custoMensalDinamico.toFixed(2).replace('.', ',') + '% a.m.'
    };
  
    this.equity_results_visible = true;
    this.compare_taxas_visible = true;
    this.card_grafico_eq_visible = true;
    this.card_spread_visual_visible = true;
  
    this.updateEquityCharts(credito, prazoTotal, mesContemplacao, custoMensalDinamico);
  }

  updateEquityCharts(credito: number, prazoTotal: number, mesContemplacao: number, custoAdemicon: number) {
    // Implement chart creation logic similar to vanilla JS version
    // This is a placeholder - implement full logic as needed
  }

  calcPerfil() {
    const investido = this.parseMoneyInput(this.pf_investido);
    const rentabilidadePct = this.parsePercentInput(this.pf_rentabilidade);
    const aporteDeclarado = this.parseMoneyInput(this.pf_aporte);
    const renda = this.parseMoneyInput(this.pf_renda);
    const custo = this.parseMoneyInput(this.pf_custo);

    const baseRendimento = investido * (rentabilidadePct / 100);
    let baseSobra = renda - custo;
    if (baseSobra < 0) baseSobra = 0;
    const baseAporte = aporteDeclarado;

    let maiorBase = 0;
    let strategyTitle = '';
    let strategyDesc = '';

    if (baseRendimento >= baseSobra && baseRendimento >= baseAporte) {
      maiorBase = baseRendimento;
      strategyTitle = 'Smart Yield';
      strategyDesc = 'Estratégia baseada na rentabilidade da sua carteira atual. Utilizamos 50% dos seus rendimentos para alavancar patrimônio sem tocar no principal.';
    } else if (baseSobra >= baseRendimento && baseSobra >= baseAporte) {
      maiorBase = baseSobra;
      strategyTitle = 'Organic Growth';
      strategyDesc = 'Estratégia baseada no seu fluxo de caixa livre (Renda - Custo). Utilizamos 50% da sua capacidade de poupança real para construção de ativos.';
    } else {
      maiorBase = baseAporte;
      strategyTitle = 'Deep Value';
      strategyDesc = 'Estratégia baseada na sua intenção de aporte declarada. Foco em alocação tática de recursos para aproveitar oportunidades de crédito.';
    }

    const sugestaoAporte = maiorBase * 0.50;
  const creditoPotencial = sugestaoAporte / 0.003334;

  // Update component results
  this.pf_results = {
    strategyTitle,
    strategyDesc,
    sugestao: sugestaoAporte,
    credito: creditoPotencial
  };

  this.perfil_result_visible = true;
  }

  calcAposentadoria() {
    const reserva = this.parseMoneyInput(this.ap_reserva);
  const aporte = this.parseMoneyInput(this.ap_aporte);
  const anos = this.ap_anos;
  const taxa = this.parsePercentInput(this.ap_taxa) / 100;

  if (anos === 0) return;

  const meses = anos * 12;
  const futuro = reserva * Math.pow((1 + taxa), meses) + 
                 (aporte * (Math.pow((1 + taxa), meses) - 1)) / taxa;
  const rendaPassiva = futuro * taxa;

  // Update component results
  this.ap_results = {
    capital: futuro,
    renda: rendaPassiva
  };

  this.ap_result_visible = true;
  }

  calcProjecaoImobiliaria() {
    const aporte = this.parseMoneyInput(this.pi_aporte);
    const anos = this.pi_anos;
    const valImovel = this.parsePercentInput(this.pi_val) / 100;
    const rentAluguel = this.parsePercentInput(this.pi_rent) / 100;

    if (aporte === 0) return;

    this.pi_table_rows = [];
    let patrimonioAcumulado = 0;
    let rendaAcumulada = 0;

    for (let i = 1; i <= anos; i++) {
      if (i % 5 === 0) {
        let creditoGerado = aporte / 0.004;
        creditoGerado = creditoGerado * Math.pow((1 + valImovel), i);

        patrimonioAcumulado += creditoGerado;
        rendaAcumulada += creditoGerado * rentAluguel;

        this.pi_table_rows.push({
          ano: i,
          evento: 'Novo Imóvel Adquirido',
          patrimonio: this.formatBRL(patrimonioAcumulado),
          renda: '+ ' + this.formatBRL(rendaAcumulada)
        });
      }
    }

    this.pi_results = {
      totalPatrimonio: patrimonioAcumulado,
      totalAluguel: rendaAcumulada
    };
  
    this.pi_result_visible = true;
  }

  // Inquilinos
  adicionarInquilino() {
    this.inquilinoCount++;
    this.inquilinos.push({
      id: this.inquilinoCount,
      credito: '',
      meses: 0,
      taxa: '',
      results_visible: false
    });
  }

  simularInquilino(id: number) {
    const inquilino = this.inquilinos.find(i => i.id === id);
    if (!inquilino) return;

    const creditoInicial = this.parseMoneyInput(inquilino.credito);
    const meses = inquilino.meses;
    const taxaAluguel = this.parsePercentInput(inquilino.taxa);

    if (creditoInicial === 0 || meses === 0) {
      alert('Preencha os valores de Crédito e Prazo.');
      return;
    }

    // Calculation logic (implement as per vanilla version)
    inquilino.results_visible = true;
    
    // Update global chart if needed
    if (this.inquilinoCount > 1) {
      this.updateGlobalChart();
    }
  }

  updateGlobalChart() {
    this.global_chart_visible = true;
    // Implement chart update logic
  }

  // Modals
  abrirModalRelatorio() {
    this.showModalResumo = true;
    // Populate report data
  }

  fecharModalResumo() {
    this.showModalResumo = false;
  }

  printReport() {
    window.print();
  }
}