import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(...registerables);

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
  selector: 'app-apresentacao',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './apresentacao.html',
  styleUrl: './apresentacao.scss',
})
export class ApresentacaoComponent implements OnInit, AfterViewInit, OnDestroy {
  private chartCenarioInstance: Chart | null = null;
  private chartComparativoInstance: Chart | null = null;
  private chartEquityInstance: Chart | null = null;
  private chartGlobalInquilinosInstance: Chart | null = null;
  private chartSpreadInstance: Chart | null = null;
  private ngContentScopeAttr: string | null = null;

  private inquilinoCount = 0;
  private dadosInquilinos: (InquilinoData | null)[] = [];

  private readonly configDefault: ConfigData = {
    adm: 24.0,
    fr: 1.0,
    prazo: 200,
    incc: 7.0,
    invest100k: 333.4,
    jurosBanco: 1.5,
    cdi: 1.0,
  };

  currentTheme: 'dark' | 'light' = 'dark';

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      this.currentTheme = savedTheme;
    }

    document.documentElement.setAttribute('data-theme', this.currentTheme);

    Chart.defaults.font.family = "'Montserrat', sans-serif";
    Chart.defaults.color = '#666';
    (Chart.defaults as any).scale = (Chart.defaults as any).scale ?? {};
    (Chart.defaults as any).scale.grid = (Chart.defaults as any).scale.grid ?? {};
    (Chart.defaults as any).scale.grid.display = false;
    (Chart.defaults as any).scale.grid.drawBorder = false;

    this.applyChartThemeDefaults();
    this.renderThemeIcon();
    this.carregarConfiguracoes();

    setTimeout(() => this.dismissSplash(), 1000);
    setTimeout(() => this.showSection('home'), 0);
  }

  ngAfterViewInit(): void {
    // no-op
  }

  ngOnDestroy(): void {
    this.chartCenarioInstance?.destroy();
    this.chartComparativoInstance?.destroy();
    this.chartEquityInstance?.destroy();
    this.chartGlobalInquilinosInstance?.destroy();
    this.chartSpreadInstance?.destroy();
  }

  dismissSplash(): void {
    const splash = this.getElement<HTMLElement>('splash-screen');
    splash?.classList.add('hidden');
  }

  toggleTheme(): void {
    const html = document.documentElement;

    if (this.currentTheme === 'light') {
      this.currentTheme = 'dark';
      html.setAttribute('data-theme', 'dark');
    } else {
      this.currentTheme = 'light';
      html.setAttribute('data-theme', 'light');
    }

    localStorage.setItem('theme', this.currentTheme);
    this.applyChartThemeDefaults();
    this.renderThemeIcon();

    this.chartCenarioInstance?.update();
    this.chartComparativoInstance?.update();
    this.chartEquityInstance?.update();
    this.chartGlobalInquilinosInstance?.update();
    this.chartSpreadInstance?.update();
    this.scheduleChartResize(this.chartCenarioInstance);
    this.scheduleChartResize(this.chartComparativoInstance);
    this.scheduleChartResize(this.chartEquityInstance);
    this.scheduleChartResize(this.chartGlobalInquilinosInstance);
    this.scheduleChartResize(this.chartSpreadInstance);
  }

  showSection(sectionId: string): void {
    document
      .querySelectorAll<HTMLElement>('.section')
      .forEach((el) => el.classList.remove('active'));
    document
      .querySelectorAll<HTMLElement>('.nav-item')
      .forEach((el) => el.classList.remove('active'));

    this.getElement<HTMLElement>(sectionId)?.classList.add('active');

    const menuOrder = [
      'home',
      'solucao',
      'cenario',
      'investimento',
      'equity',
      'alavancagem',
      'assuncao',
      'gestao',
      'perfil',
    ];

    const menuIndex = menuOrder.indexOf(sectionId);
    if (menuIndex !== -1) {
      const navItems = document.querySelectorAll<HTMLElement>('.nav-item');
      navItems.item(menuIndex)?.classList.add('active');
    }

    if (sectionId === 'alavancagem' && this.inquilinoCount === 0) {
      this.adicionarInquilino();
    }

    if (sectionId === 'cenario') {
      setTimeout(() => this.initChartCenario(), 100);
    }
  }

  formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  formatPercent(value: number): string {
    return (
      value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + '%'
    );
  }

  formatarMoedaInput(eventOrInput?: Event | HTMLInputElement | null): void {
    const input = this.resolveInput(eventOrInput);
    if (!input) return;

    let raw = input.value.replace(/\D/g, '');
    if (!raw) {
      input.value = '';
      return;
    }

    raw = (Number.parseFloat(raw) / 100).toFixed(2);
    raw = raw.replace('.', ',');
    raw = raw.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + raw;
  }

  formatarDecimalInput(eventOrInput?: Event | HTMLInputElement | null): void {
    const input = this.resolveInput(eventOrInput);
    if (!input) return;

    let value = input.value.replace(/[^\d,]/g, '');
    const parts = value.split(',');
    if (parts.length > 2) {
      value = parts[0] + ',' + parts.slice(1).join('');
    }

    input.value = value;
  }

  parseMoneyInput(id: string): number {
    const input = this.getElement<HTMLInputElement>(id);
    if (!input) return 0;
    const val = input.value.replace(/[^\d,]/g, '');
    const parsed = Number.parseFloat(val.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  parsePercentInput(id: string): number {
    const input = this.getElement<HTMLInputElement>(id);
    if (!input) return 0;
    const parsed = Number.parseFloat(input.value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  animateValue(id: string, start: number, end: number, duration: number): void {
    const el = this.getElement<HTMLElement>(id);
    if (!el) return;

    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const value = progress * (end - start) + start;
      el.innerText = this.formatBRL(value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }

  createGradient(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    return gradient;
  }

  carregarConfiguracoes(): void {
    const saved = localStorage.getItem('ademicon_config');
    const config = saved
      ? (JSON.parse(saved) as ConfigData)
      : this.configDefault;

    this.setInputValue('cfg_taxa_adm', config.adm.toFixed(2).replace('.', ','));
    this.setInputValue('cfg_fundo_reserva', config.fr.toFixed(2).replace('.', ','));
    this.setInputValue('cfg_prazo', String(config.prazo));
    this.setInputValue('cfg_incc', config.incc.toFixed(2).replace('.', ','));
    this.setInputValue(
      'cfg_invest_100k',
      'R$ ' + config.invest100k.toFixed(2).replace('.', ','),
    );
    this.setInputValue(
      'cfg_juros_banco',
      config.jurosBanco.toFixed(2).replace('.', ','),
    );
    this.setInputValue('cfg_cdi', config.cdi.toFixed(2).replace('.', ','));
  }

  salvarConfiguracoes(): void {
    const prazo = Number.parseInt(this.getInputValue('cfg_prazo'), 10);

    const config: ConfigData = {
      adm: this.parsePercentInput('cfg_taxa_adm'),
      fr: this.parsePercentInput('cfg_fundo_reserva'),
      prazo: Number.isFinite(prazo) && prazo > 0 ? prazo : 200,
      incc: this.parsePercentInput('cfg_incc'),
      invest100k: this.parseMoneyInput('cfg_invest_100k'),
      jurosBanco: this.parsePercentInput('cfg_juros_banco'),
      cdi: this.parsePercentInput('cfg_cdi'),
    };

    localStorage.setItem('ademicon_config', JSON.stringify(config));
    this.closeConfigModal();
    alert('Configurações salvas! Recalcule os cenários para ver a alteração.');

    if (this.chartCenarioInstance) {
      this.revealCenario('avista');
    }
  }

  getCfg(key: keyof ConfigData): number {
    const saved = localStorage.getItem('ademicon_config');
    const config = saved
      ? (JSON.parse(saved) as ConfigData)
      : this.configDefault;
    return config[key];
  }

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
        creditoBase *= 1 + incc;
        saldoDevedorAtual *= 1 + incc;
      }
      totalPagoNominal += creditoBase * fatorMeiaParcela;
    }

    const saldoRemanescente = saldoDevedorAtual - totalPagoNominal;
    let prazoRestante = prazoTotal - mesesDecorridos;
    if (prazoRestante <= 0) prazoRestante = 1;

    return saldoRemanescente / prazoRestante;
  }

  toggleContent(id: string): void {
    const el = this.getElement<HTMLElement>(id);
    if (!el) return;

    if (id === 'vol_reveal') {
      this.setDisplay('vol_hint', 'none');
      el.style.display = 'block';
      return;
    }

    el.style.display = el.style.display === 'block' ? 'none' : 'block';
  }

  switchSubTab(tabId: string, event: Event): void {
    document
      .querySelectorAll<HTMLElement>('.sub-tab-content')
      .forEach((el) => el.classList.remove('active'));
    document
      .querySelectorAll<HTMLElement>('.sub-tab-item')
      .forEach((el) => el.classList.remove('active'));

    this.getElement<HTMLElement>(tabId)?.classList.add('active');

    const btn = event.currentTarget as HTMLElement | null;
    btn?.classList.add('active');
  }

  initChartCenario(): void {
    const ctx = this.getCanvasContext('chartCenario');
    if (!ctx) return;

    const gradGreen = this.createGradient(ctx, 'rgba(16, 185, 129, 0.9)');
    const gradGold = this.createGradient(ctx, 'rgba(212, 175, 55, 0.9)');
    const gradRed = this.createGradient(ctx, 'rgba(239, 68, 68, 0.9)');

    this.chartCenarioInstance?.destroy();

    this.chartCenarioInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Ademicon', 'Descapitalização', 'Financiamento'],
        datasets: [
          {
            label: 'Taxa Mensal',
            data: [0, 0, 0],
            backgroundColor: [gradGreen, gradGold, gradRed],
            borderRadius: 6,
            barThickness: 50,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { display: false, suggestedMax: 2.5 },
          x: {
            ticks: {
              color: this.currentTheme === 'light' ? '#4B5563' : '#ffffff',
              font: { size: 10 },
            },
            grid: { display: false },
          },
        },
      },
    } as any);

    this.scheduleChartResize(this.chartCenarioInstance);
  }

  revealCenario(type: 'avista' | 'banco' | 'ademicon' | string): void {
    this.setDisplay('reveal-' + type, 'block');
    if (!this.chartCenarioInstance) return;

    const data = this.chartCenarioInstance.data.datasets[0].data as number[];

    if (type === 'avista') data[1] = this.getCfg('cdi');
    if (type === 'banco') data[2] = this.getCfg('jurosBanco') + 0.3;
    if (type === 'ademicon') data[0] = 0.12;

    this.chartCenarioInstance.update();
  }

  calcInvestimento(): void {
    const creditoInicial = this.parseMoneyInput('inv_credito');
    const mesesAteContemplacao = Number.parseInt(this.getInputValue('inv_meses'), 10) || 0;
    const agioPct = this.parsePercentInput('inv_agio');

    if (creditoInicial === 0 || mesesAteContemplacao === 0) return;

    const inccAnual = this.getCfg('incc') / 100;
    const custo100k = this.getCfg('invest100k');
    const fatorMeiaParcela = custo100k / 100000;
    const cdiMensal = this.getCfg('cdi') / 100;

    const anosDecimais = mesesAteContemplacao / 12;
    const creditoCorrigido = creditoInicial * Math.pow(1 + inccAnual, anosDecimais);

    let totalInvestido = 0;
    let parcelaAtual = creditoInicial * fatorMeiaParcela;
    const labelsMeses: number[] = [];
    const dataCDI: number[] = [];
    let saldoCDI = 0;

    for (let m = 1; m <= mesesAteContemplacao; m++) {
      if (m > 1 && (m - 1) % 12 === 0) {
        parcelaAtual *= 1 + inccAnual;
      }
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

    this.setDisplay('liquidez_results', 'block');

    this.animateValue('inv_mensal_inicial', 0, parcelaInicial, 1000);
    this.animateValue('res_investido', 0, totalInvestido, 1000);
    this.animateValue('res_credito_corr', 0, creditoCorrigido, 1000);
    this.animateValue('res_venda', 0, valorVendaCashIn, 1500);
    this.animateValue('res_lucro_liq', 0, lucroLiquido, 1500);

    this.setText('res_roi_total', roiTotal.toFixed(2).replace('.', ',') + '%');
    this.setText(
      'res_roi_mes',
      roiMensalSimples.toFixed(2).replace('.', ',') + '% a.m.',
    );

    const ctxComp = this.getCanvasContext('chartComparativo');
    if (!ctxComp) return;

    const gradRed = this.createGradient(ctxComp, 'rgba(237, 28, 36, 0.9)');
    this.chartComparativoInstance?.destroy();

    const dataAdemicon = new Array<number | null>(mesesAteContemplacao).fill(null);
    dataAdemicon[mesesAteContemplacao - 1] = valorVendaCashIn;

    this.chartComparativoInstance = new Chart(ctxComp, {
      type: 'line',
      data: {
        labels: labelsMeses,
        datasets: [
          {
            label: 'CDI Acumulado',
            data: dataCDI,
            borderColor: '#666',
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Liquidez Ademicon',
            data: dataAdemicon,
            type: 'bar',
            backgroundColor: gradRed,
            barThickness: 15,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#999', font: { size: 10 } } },
        },
        scales: { y: { display: false }, x: { display: false } },
      },
    } as any);

    this.scheduleChartResize(this.chartComparativoInstance);
  }

  calcEquity(): void {
    const credito = this.parseMoneyInput('eq_credito');
    const mesContemplacao = Number.parseInt(this.getInputValue('eq_meses'), 10) || 0;

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
      if (m > 1 && (m - 1) % 12 === 0) {
        parcelaAtualLoop *= 1 + incc;
      }
      acumuladoPre += parcelaAtualLoop;
    }

    this.setDisplay('equity_results', 'block');
    this.setDisplay('compare_taxas', 'grid');
    this.setDisplay('card_grafico_eq', 'block');
    this.setDisplay('card_spread_visual', 'block');

    this.animateValue('eq_parcela_meia', 0, valorMeiaParcela, 1000);
    this.animateValue('eq_total_acumulado', 0, acumuladoPre, 1000);
    this.animateValue('eq_parcela_cheia', 0, valorParcelaCheia, 1000);
    this.animateValue('eq_credito_futuro', 0, creditoFuturo, 1000);

    this.setText(
      'eq_custo_consorcio',
      custoMensalDinamico.toFixed(2).replace('.', ',') + '% a.m.',
    );

    const taxaBanco = this.getCfg('jurosBanco') / 100;
    const pmtBanco =
      taxaBanco > 0
        ? credito * (taxaBanco / (1 - Math.pow(1 + taxaBanco, -prazoTotal)))
        : credito / prazoTotal;

    const dadosAdemicon: number[] = [];
    const dadosBanco: number[] = [];
    const labels: number[] = [];

    let acumuladoAdemicon = 0;
    let acumuladoBanco = 0;

    for (let i = 1; i <= prazoTotal; i++) {
      let parcelaAtualAdemicon = 0;

      if (i <= mesContemplacao) {
        const anosAntes = Math.floor((i - 1) / 12);
        const fator = Math.pow(1 + incc, anosAntes);
        parcelaAtualAdemicon = valorMeiaParcela * fator;
      } else {
        const anosPos = Math.floor((i - mesContemplacao - 1) / 12);
        const fatorPos = Math.pow(1 + incc, anosPos);
        parcelaAtualAdemicon = valorParcelaCheia * fatorPos;
      }

      acumuladoAdemicon += parcelaAtualAdemicon;
      acumuladoBanco += pmtBanco;

      if (i % 5 === 0 || i === 1) {
        labels.push(i);
        dadosAdemicon.push(acumuladoAdemicon);
        dadosBanco.push(acumuladoBanco);
      }
    }

    this.setText('res_economia_eq', this.formatBRL(acumuladoBanco - acumuladoAdemicon));
    this.updateEquityCharts(labels, dadosBanco, dadosAdemicon, custoMensalDinamico);
  }

  updateEquityCharts(
    labels: number[],
    dadosBanco: number[],
    dadosAdemicon: number[],
    custoAdemicon: number,
  ): void {
    const ctx = this.getCanvasContext('chartEquity');
    const ctxSpread = this.getCanvasContext('chartSpread');
    if (!ctx || !ctxSpread) return;

    const gradGreenFill = this.createGradient(ctx, 'rgba(16, 185, 129, 0.4)');

    this.chartEquityInstance?.destroy();
    this.chartEquityInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Custo Banco',
            data: dadosBanco,
            borderColor: '#ef4444',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
          {
            label: 'Custo Ademicon',
            data: dadosAdemicon,
            borderColor: '#10b981',
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            backgroundColor: gradGreenFill,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#999' } } },
        scales: {
          y: { display: false },
          x: { ticks: { color: '#666' }, grid: { display: false } },
        },
      },
    } as any);
    this.scheduleChartResize(this.chartEquityInstance);

    const spread = this.getCfg('jurosBanco') - custoAdemicon;
    const gradRed = this.createGradient(ctxSpread, 'rgba(237, 28, 36, 0.9)');
    const gradGreen = this.createGradient(ctxSpread, 'rgba(16, 185, 129, 0.9)');

    this.chartSpreadInstance?.destroy();
    this.chartSpreadInstance = new Chart(ctxSpread, {
      type: 'bar',
      data: {
        labels: ['Rentabilidade vs Custo'],
        datasets: [
          {
            label: 'Custo Funding',
            data: [custoAdemicon],
            backgroundColor: gradRed,
            barPercentage: 0.6,
          },
          {
            label: 'Spread (Ganho)',
            data: [spread],
            backgroundColor: gradGreen,
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            color: '#fff',
            font: { weight: 'bold' },
            formatter: (value: number) => value.toFixed(2) + '%',
          },
        },
        scales: {
          x: { stacked: true, display: false },
          y: { stacked: true, display: false },
        },
      },
      plugins: [ChartDataLabels],
    } as any);
    this.scheduleChartResize(this.chartSpreadInstance);
  }

  calcLances(): void {
    const credito = this.parseMoneyInput('cl_credito');
    const prazoTotal = Number.parseInt(this.getInputValue('cl_prazo'), 10) || 200;
    const pctLance = this.parsePercentInput('cl_lance_pct');
    const tipo = this.getInputValue('cl_tipo') || 'livre';

    if (credito === 0) return;

    const valorLance = credito * (pctLance / 100);
    const taxaTotalPct = 26.0;
    const custoTotalReais = credito * (taxaTotalPct / 100);

    const saldoDevedorTotal = credito + custoTotalReais;
    const parcelaOriginal = saldoDevedorTotal / prazoTotal;

    let creditoLiquido = 0;
    let amortizacao = 0;
    let parcelaPos = 0;
    let obsParcela = '';
    let obsCredito = '';

    if (tipo === 'embutido') {
      creditoLiquido = credito - valorLance;
      amortizacao = valorLance;

      const saldoDevedorPos = saldoDevedorTotal - amortizacao;
      parcelaPos = saldoDevedorPos / prazoTotal;

      obsParcela = '*Amortização de Parcela (Diluição)';
      obsCredito = '*O valor do lance foi descontado da carta. (Menor Liquidez)';
    } else {
      creditoLiquido = credito;
      amortizacao = valorLance;
      parcelaPos = parcelaOriginal;

      obsParcela = '*Amortização de Prazo (Parcela Mantida)';
      obsCredito =
        '*Lance pago com recursos próprios. Crédito integral disponível.';
    }

    if (creditoLiquido <= 0) return;

    const taxaEfetivaTotal = (custoTotalReais / creditoLiquido) * 100;
    const taxaEfetivaMensal = taxaEfetivaTotal / prazoTotal;

    this.setDisplay('cl_results', 'block');

    this.animateValue('cl_credito_liquido', 0, creditoLiquido, 1000);
    this.setText(
      'cl_custo_mensal',
      taxaEfetivaMensal.toFixed(4).replace('.', ',') + '% a.m.',
    );

    this.setText('cl_valor_lance', this.formatBRL(valorLance));
    this.setText('cl_amortizacao', '- ' + this.formatBRL(amortizacao));
    this.setText('cl_parcela_atual', this.formatBRL(parcelaOriginal));
    this.animateValue('cl_parcela_pos', 0, parcelaPos, 1500);

    this.setText('cl_obs_parcela', obsParcela);
    this.setText('cl_obs_credito', obsCredito);
  }

  adicionarInquilino(): void {
    this.inquilinoCount += 1;
    const container = this.getElement<HTMLElement>('inquilinos-container');
    if (!container) return;

    const id = this.inquilinoCount;
    const html = `
      <div class="card" id="card-inquilino-${id}">
        <div class="tenant-header"><span class="tenant-title">Inquilino ${id} (Imóvel ${id})</span><span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Planejamento Imobiliário</span></div>
        <div class="grid-2">
          <div id="inputs-${id}">
            <label>Investimento em Crédito Inicial</label><input type="text" id="inq_credito_${id}" placeholder="R$ 1.000.000,00">
            <label>Período de Contemplação (Meses)</label><input type="number" id="inq_meses_${id}" placeholder="Ex: 50">
            <div style="margin-top: 15px; margin-bottom: 15px;"><label style="margin-bottom: 8px; color: #777;">Yield Esperado (% a.m.)</label><div style="margin-bottom: 10px;"><span class="info-pill">Curto Prazo: 1.8%</span><span class="info-pill">Comercial: 1.0%</span><span class="info-pill">Residencial: 0.5%</span></div><div class="input-group input-suffix"><input type="text" id="inq_taxa_${id}" placeholder="Ex: 0,50"><span class="suffix-symbol">% a.m.</span></div></div>
            <button id="btn-simular-${id}" class="btn-action" type="button">Revelar Cenário ${id}</button>
          </div>
          <div id="resultados-${id}" style="display: none;">
            <h3 style="color: var(--text-main); border-bottom: 1px solid var(--border); padding-bottom: 5px; font-weight:300;">Dados da Operação</h3>
            <div class="grid-2" style="margin-bottom: 15px; gap: 10px;">
              <div><span class="label-result">Investimento Mensal Inicial</span><strong style="display:block; font-size: 20px; color: #facc15;" id="res_parc_inicial_${id}">R$ 0,00</strong><small style="color: var(--text-muted); font-size: 9px;">(Meia Parcela)</small></div>
              <div><span class="label-result">Total Investido (Até Mês <span id="lbl_mes_${id}">0</span>)</span><strong style="display:block; font-size: 20px; color: var(--text-secondary);" id="res_investido_${id}">R$ 0,00</strong><small style="color: var(--text-muted); font-size: 9px;">(Entrada + Aportes + INCC)</small></div>
            </div>
            <div style="margin-bottom: 15px;"><span class="label-result">Crédito Atualizado na Contemplação</span><strong style="display:block; font-size: 24px; color: var(--brand-red);" id="res_credito_${id}">R$ 0,00</strong><small style="color: var(--text-muted); font-size: 9px;">(Poder de Compra Real)</small></div>
            <div class="grid-2" style="gap: 10px;"><div style="background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);"><span class="label-result">Investimento Mensal Pós</span><strong style="display:block; font-size: 18px; color: #ef4444;" id="res_parcela_${id}">R$ 0,00</strong></div><div style="background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.3);"><span class="label-result">Receita Aluguel</span><strong style="display:block; font-size: 18px; color: #10b981;" id="res_aluguel_${id}">R$ 0,00</strong></div></div>
            <div style="margin-top: 15px; text-align: center; border-top: 1px solid var(--border); padding-top: 10px;"><span class="label-result">Fluxo de Caixa Líquido (Sobra)</span><strong style="display:block; font-size: 28px; color: var(--text-main);" id="res_fluxo_${id}">R$ 0,00</strong></div>
          </div>
        </div>
      </div>`;

    const div = document.createElement('div');
    div.innerHTML = html.trim();
    this.applyContentScopeAttr(div, container);
    container.appendChild(div);
    this.bindInquilinoInteractions(id);

    if (id > 1) {
      setTimeout(() => {
        this.getElement<HTMLElement>(`card-inquilino-${id}`)?.scrollIntoView({
          behavior: 'smooth',
        });
      }, 100);
    }
  }

  simularInquilino(id: number): void {
    const creditoInicial = this.parseMoneyInput(`inq_credito_${id}`);
    const meses = Number.parseInt(this.getInputValue(`inq_meses_${id}`), 10) || 0;
    const taxaAluguel = this.parsePercentInput(`inq_taxa_${id}`);

    if (creditoInicial === 0 || meses === 0) {
      alert('Preencha os valores de Crédito e Prazo.');
      return;
    }

    const inccAnual = 0.07;
    const fatorMeiaParcela = 0.003334;

    const valParcelaInicial = creditoInicial * fatorMeiaParcela;
    const anosDecimais = meses / 12;
    const creditoCorrigido = creditoInicial * Math.pow(1 + inccAnual, anosDecimais);

    let totalInvestidoPadrao = 0;
    let parcelaAtual = creditoInicial * fatorMeiaParcela;

    for (let m = 1; m <= meses; m++) {
      if (m > 1 && (m - 1) % 12 === 0) {
        parcelaAtual *= 1 + inccAnual;
      }
      totalInvestidoPadrao += parcelaAtual;
    }

    const parcelaPos = this.calcularParcelaSmart(creditoInicial, meses);
    const receitaAluguel = creditoCorrigido * (taxaAluguel / 100);
    const fluxoCaixa = receitaAluguel - parcelaPos;

    let investidoRealDoBolso = 0;

    if (id === 1) {
      investidoRealDoBolso = totalInvestidoPadrao;
      this.animateValue(`res_parc_inicial_${id}`, 0, valParcelaInicial, 1000);
      this.animateValue(`res_investido_${id}`, 0, totalInvestidoPadrao, 1000);
    } else {
      const prevData = this.dadosInquilinos[id - 2];
      if (prevData) {
        const prevSobra = prevData.sobra;
        const saldoMensal = prevSobra - valParcelaInicial;

        if (saldoMensal >= 0) {
          investidoRealDoBolso = 0;
          this.setHtml(
            `res_parc_inicial_${id}`,
            `<span style='color:#10b981;'>R$ 0,00</span><small style='color:var(--text-muted); display:block; font-size:9px;'>(Custeado pela Sobra Anterior: ${this.formatBRL(prevSobra)})</small>`,
          );
          this.setHtml(
            `res_investido_${id}`,
            `<span style='color:#10b981;'>R$ 0,00</span> <span style='font-size:9px; color:var(--text-muted);'>(Autossustentável)</span>`,
          );
        } else {
          const diferencaMensal = Math.abs(saldoMensal);
          let totalDiferencaAcumulada = 0;
          let parcelaAtualDiferenca = diferencaMensal;

          for (let m = 1; m <= meses; m++) {
            if (m > 1 && (m - 1) % 12 === 0) {
              parcelaAtualDiferenca *= 1 + inccAnual;
            }
            totalDiferencaAcumulada += parcelaAtualDiferenca;
          }

          investidoRealDoBolso = totalDiferencaAcumulada;

          this.setHtml(
            `res_parc_inicial_${id}`,
            `<span style='color:#ef4444;'>${this.formatBRL(diferencaMensal)}</span><small style='color:var(--text-muted); display:block; font-size:9px;'>(Parcela: ${this.formatBRL(valParcelaInicial)} - Sobra Ant: ${this.formatBRL(prevSobra)})</small>`,
          );
          this.setHtml(
            `res_investido_${id}`,
            `<span style='color:#ef4444;'>${this.formatBRL(investidoRealDoBolso)}</span><span style='font-size:9px; color:var(--text-muted);'>(Aporte Complementar)</span>`,
          );
        }
      }
    }

    this.dadosInquilinos[id - 1] = {
      investido: investidoRealDoBolso,
      patrimonio: creditoCorrigido,
      renda: receitaAluguel,
      sobra: fluxoCaixa,
    };

    this.setText(`lbl_mes_${id}`, String(meses));
    this.animateValue(`res_credito_${id}`, 0, creditoCorrigido, 1000);
    this.setText(`res_parcela_${id}`, '(-) ' + this.formatBRL(parcelaPos));
    this.setText(`res_aluguel_${id}`, '(+) ' + this.formatBRL(receitaAluguel));

    const elFluxo = this.getElement<HTMLElement>(`res_fluxo_${id}`);
    if (elFluxo) {
      elFluxo.innerText = this.formatBRL(fluxoCaixa);
      elFluxo.style.color = fluxoCaixa >= 0 ? '#10b981' : '#ef4444';
    }

    if (id > 1) {
      this.updateGlobalChart();
    }

    this.setDisplay(`resultados-${id}`, 'block');
    this.setDisplay('btn-add-inquilino', 'inline-block');
  }

  updateGlobalChart(): void {
    this.setDisplay('global-chart-container', 'block');

    const ctx = this.getCanvasContext('chartGlobalInquilinos');
    if (!ctx) return;

    const gradGoldFill = this.createGradient(ctx, 'rgba(212, 175, 55, 0.4)');

    this.chartGlobalInquilinosInstance?.destroy();

    const labels: string[] = ['Início'];
    const dataInvestido: number[] = [0];
    const dataPatrimonio: number[] = [0];
    const dataRenda: number[] = [0];

    let sumInvestido = 0;
    let sumPatrimonio = 0;
    let sumRenda = 0;

    this.dadosInquilinos.forEach((dado, index) => {
      if (!dado) return;

      labels.push(`Imóvel ${index + 1}`);
      sumInvestido += dado.investido;
      sumPatrimonio += dado.patrimonio;
      sumRenda += dado.renda;

      dataInvestido.push(sumInvestido);
      dataPatrimonio.push(sumPatrimonio);
      dataRenda.push(sumRenda);
    });

    this.animateValue('sum_investido', 0, sumInvestido, 1000);
    this.animateValue('sum_patrimonio', 0, sumPatrimonio, 1500);
    this.animateValue('sum_renda', 0, sumRenda, 1200);

    const lastInq = this.dadosInquilinos[this.dadosInquilinos.length - 1];
    if (lastInq) {
      this.setText('sum_sobra', this.formatBRL(lastInq.sobra));
    }

    this.chartGlobalInquilinosInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Patrimônio',
            data: dataPatrimonio,
            borderColor: '#D4AF37',
            backgroundColor: gradGoldFill,
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Investimento (Bolso)',
            data: dataInvestido,
            borderColor: '#10b981',
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
          },
          {
            label: 'Renda Mensal',
            data: dataRenda,
            borderColor: '#0ea5e9',
            fill: false,
            tension: 0.3,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { display: false },
          y1: { position: 'right', display: false },
          x: { ticks: { color: '#666' }, grid: { display: false } },
        },
      },
    } as any);
    this.scheduleChartResize(this.chartGlobalInquilinosInstance);
  }

  abrirModalRelatorio(): void {
    this.setText('rep_investido', this.getInputValue('pf_investido') || 'R$ 0,00');
    this.setText('rep_renda', this.getInputValue('pf_renda') || 'R$ 0,00');
    this.setText('rep_patrimonio', this.getInputValue('pf_imoveis') || 'R$ 0,00');
    this.setText('rep_aporte', this.getInputValue('pf_aporte') || 'R$ 0,00');

    const stratTitle = this.getInnerText('pf_strategy_title');
    this.setText(
      'rep_strategy_title',
      stratTitle === '---' ? 'Análise Pendente' : stratTitle,
    );
    this.setText('rep_strategy_desc', this.getInnerText('pf_strategy_desc'));
    this.setText('rep_sugestao', this.getInnerText('pf_sugestao'));
    this.setText('rep_credito', this.getInnerText('pf_credito'));

    this.setText('print_liq_credito', this.getInputValue('inv_credito') || '-');
    this.setText('print_liq_credito_corr', this.getInnerText('res_credito_corr') || '-');
    this.setText(
      'print_liq_prazo',
      (this.getInputValue('inv_meses') || '-') + ' meses',
    );
    this.setText('print_liq_inicial', this.getInnerText('inv_mensal_inicial') || '-');
    this.setText('print_liq_lucro', this.getInnerText('res_lucro_liq'));
    this.setText('print_liq_venda', this.getInnerText('res_venda'));
    this.setText('print_liq_roi', this.getInnerText('res_roi_mes'));

    this.setText('print_eq_credito', this.getInputValue('eq_credito') || '-');
    this.setText(
      'print_eq_prazo',
      (this.getInputValue('eq_meses') || '-') + ' meses',
    );
    this.setText('print_eq_inicial', this.getInnerText('eq_parcela_meia') || '-');
    this.setText('print_eq_pos', this.getInnerText('eq_parcela_cheia') || '-');
    this.setText('print_eq_disponivel', this.getInnerText('eq_credito_futuro') || '-');
    this.setText('print_eq_custo', this.getInnerText('eq_custo_consorcio') || '-');

    this.setText('print_ala_credito1', this.getInputValue('inq_credito_1') || 'R$ 0,00');
    this.setText('print_ala_parcela1', this.getInnerText('res_parc_inicial_1') || 'R$ 0,00');

    this.setText('print_ala_investido', this.getInnerText('sum_investido'));
    this.setText('print_ala_pat', this.getInnerText('sum_patrimonio'));
    this.setText('print_ala_renda', this.getInnerText('sum_renda'));
    this.setText('print_ala_sobra', this.getInnerText('sum_sobra'));

    let totalMesesAlavancagem = 0;
    for (let i = 1; i <= this.inquilinoCount; i++) {
      totalMesesAlavancagem += Number.parseInt(this.getInputValue(`inq_meses_${i}`), 10) || 0;
    }

    const anos = Math.floor(totalMesesAlavancagem / 12);
    const mesesRestantes = totalMesesAlavancagem % 12;
    const textoTempo = `${totalMesesAlavancagem} Meses (~${anos} Anos${mesesRestantes > 0 ? ' e ' + mesesRestantes + ' m' : ''})`;
    this.setText('print_ala_tempo', textoTempo);

    const printChart = this.getElement<HTMLImageElement>('print_ala_chart_img');
    if (this.chartGlobalInquilinosInstance && printChart) {
      printChart.src = this.chartGlobalInquilinosInstance.toBase64Image();
      printChart.style.display = 'block';
    } else if (printChart) {
      printChart.style.display = 'none';
    }

    this.setDisplay('modal-resumo', 'flex');
  }

  calcPerfil(): void {
    const investido = this.parseMoneyInput('pf_investido');
    const rentabilidadePct = this.parsePercentInput('pf_rentabilidade');
    const aporteDeclarado = this.parseMoneyInput('pf_aporte');
    const renda = this.parseMoneyInput('pf_renda');
    const custo = this.parseMoneyInput('pf_custo');

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
      strategyDesc =
        'Estratégia baseada na rentabilidade da sua carteira atual. Utilizamos 50% dos seus rendimentos para alavancar patrimônio sem tocar no principal.';
    } else if (baseSobra >= baseRendimento && baseSobra >= baseAporte) {
      maiorBase = baseSobra;
      strategyTitle = 'Organic Growth';
      strategyDesc =
        'Estratégia baseada no seu fluxo de caixa livre (Renda - Custo). Utilizamos 50% da sua capacidade de poupança real para construção de ativos.';
    } else {
      maiorBase = baseAporte;
      strategyTitle = 'Deep Value';
      strategyDesc =
        'Estratégia baseada na sua intenção de aporte declarada. Foco em alocação tática de recursos para aproveitar oportunidades de crédito.';
    }

    const sugestaoAporte = maiorBase * 0.5;
    const creditoPotencial = sugestaoAporte / 0.003334;

    this.setText('pf_strategy_title', strategyTitle);
    this.setText('pf_strategy_desc', strategyDesc);
    this.animateValue('pf_sugestao', 0, sugestaoAporte, 1000);
    this.animateValue('pf_credito', 0, creditoPotencial, 1000);
    this.setDisplay('perfil-result', 'block');
  }

  calcAposentadoria(): void {
    const reserva = this.parseMoneyInput('ap_reserva');
    const aporte = this.parseMoneyInput('ap_aporte');
    const anos = Number.parseInt(this.getInputValue('ap_anos'), 10) || 0;
    const taxa = this.parsePercentInput('ap_taxa') / 100;

    if (anos === 0 || taxa <= 0) return;

    const meses = anos * 12;
    const futuro =
      reserva * Math.pow(1 + taxa, meses) +
      (aporte * (Math.pow(1 + taxa, meses) - 1)) / taxa;
    const rendaPassiva = futuro * taxa;

    this.animateValue('ap_banco_cap', 0, futuro, 1000);
    this.animateValue('ap_banco_renda', 0, rendaPassiva, 1000);
    this.setDisplay('ap_result', 'block');
  }

  calcProjecaoImobiliaria(): void {
    const aporte = this.parseMoneyInput('pi_aporte');
    const anos = Number.parseInt(this.getInputValue('pi_anos'), 10) || 15;
    const valImovel = this.parsePercentInput('pi_val') / 100;
    const rentAluguel = this.parsePercentInput('pi_rent') / 100;

    if (aporte === 0) return;

    const tbody = this.getElement<HTMLElement>('pi_table_body');
    if (!tbody) return;

    tbody.innerHTML = '';

    let patrimonioAcumulado = 0;
    let rendaAcumulada = 0;

    for (let i = 1; i <= anos; i++) {
      if (i % 5 === 0) {
        let creditoGerado = aporte / 0.004;
        creditoGerado = creditoGerado * Math.pow(1 + valImovel, i);

        patrimonioAcumulado += creditoGerado;
        rendaAcumulada += creditoGerado * rentAluguel;

        const tr = `<tr>
          <td>Ano ${i}</td>
          <td>Novo Imóvel Adquirido</td>
          <td>${this.formatBRL(patrimonioAcumulado)}</td>
          <td style="color:#10b981;">+ ${this.formatBRL(rendaAcumulada)}</td>
        </tr>`;

        tbody.innerHTML += tr;
      }
    }

    this.animateValue('pi_total_pat', 0, patrimonioAcumulado, 1500);
    this.animateValue('pi_total_alu', 0, rendaAcumulada, 1500);
    this.setText('pi_anos_display', String(anos));
    this.setDisplay('pi_result', 'block');
  }

  openConfigModal(): void {
    this.setDisplay('modal-config', 'flex');
  }

  closeConfigModal(): void {
    this.setDisplay('modal-config', 'none');
  }

  closeResumoModal(): void {
    this.setDisplay('modal-resumo', 'none');
  }

  printReport(): void {
    window.print();
  }

  syncDisplayText(targetId: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.setText(targetId, target.value);
  }

  private applyChartThemeDefaults(): void {
    if (this.currentTheme === 'light') {
      Chart.defaults.color = '#4B5563';
      Chart.defaults.borderColor = '#E5E7EB';
      return;
    }

    Chart.defaults.color = '#666';
    Chart.defaults.borderColor = '#333';
  }

  private renderThemeIcon(): void {
    const icon = this.getElement<HTMLElement>('theme-icon');
    if (!icon) return;

    if (this.currentTheme === 'light') {
      icon.innerHTML =
        '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
      return;
    }

    icon.innerHTML =
      '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  }

  private resolveInput(
    eventOrInput?: Event | HTMLInputElement | null,
  ): HTMLInputElement | null {
    if (!eventOrInput) return null;

    if (eventOrInput instanceof HTMLInputElement) {
      return eventOrInput;
    }

    const target = eventOrInput.target;
    return target instanceof HTMLInputElement ? target : null;
  }

  private getCanvasContext(id: string): CanvasRenderingContext2D | null {
    const canvas = this.getElement<HTMLCanvasElement>(id);
    return canvas?.getContext('2d') ?? null;
  }

  private getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  private getInputValue(id: string): string {
    return this.getElement<HTMLInputElement>(id)?.value ?? '';
  }

  private getInnerText(id: string): string {
    return this.getElement<HTMLElement>(id)?.innerText ?? '';
  }

  private setInputValue(id: string, value: string): void {
    const input = this.getElement<HTMLInputElement>(id);
    if (input) input.value = value;
  }

  private setText(id: string, text: string): void {
    const el = this.getElement<HTMLElement>(id);
    if (el) el.innerText = text;
  }

  private setHtml(id: string, html: string): void {
    const el = this.getElement<HTMLElement>(id);
    if (el) el.innerHTML = html;
  }

  private setDisplay(id: string, value: string): void {
    const el = this.getElement<HTMLElement>(id);
    if (el) el.style.display = value;
  }

  private scheduleChartResize(chart: Chart | null): void {
    if (!chart) return;
    window.requestAnimationFrame(() => chart.resize());
  }

  private bindInquilinoInteractions(id: number): void {
    const creditoInput = this.getElement<HTMLInputElement>(`inq_credito_${id}`);
    creditoInput?.addEventListener('input', (event) =>
      this.formatarMoedaInput(event),
    );

    const taxaInput = this.getElement<HTMLInputElement>(`inq_taxa_${id}`);
    taxaInput?.addEventListener('input', (event) =>
      this.formatarDecimalInput(event),
    );

    const button = this.getElement<HTMLButtonElement>(`btn-simular-${id}`);
    button?.addEventListener('click', () => this.simularInquilino(id));
  }

  private applyContentScopeAttr(root: HTMLElement, reference: HTMLElement): void {
    const scopeAttr =
      this.ngContentScopeAttr ??
      Array.from(reference.attributes).find((attr) =>
        attr.name.startsWith('_ngcontent-'),
      )?.name ??
      null;

    if (!scopeAttr) return;

    this.ngContentScopeAttr = scopeAttr;
    root.setAttribute(scopeAttr, '');
    root
      .querySelectorAll<HTMLElement>('*')
      .forEach((element) => element.setAttribute(scopeAttr, ''));
  }
}
