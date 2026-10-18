'use strict';
const $ = id => document.getElementById(id);
const euro = value => new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const compact = value => value>=1000000?'€'+(value/1000000).toFixed(2)+'m':value>=1000?'€'+Math.round(value/1000)+'k':'€'+Math.round(value);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round = x => Math.round(x*100)/100;
function monthlyPayment(balance, annualRate, months){
  if(months<=0) return 0;
  const rate=annualRate/1200;
  if(rate===0) return balance/months;
  return balance*rate/(1-Math.pow(1+rate,-months));
}
function readScenario(id){
  const num=key=>Number($(id+'-'+key).value);
  const config={amount:num('amount'),term:num('term'),type:$(id+'-type').value,fixed:num('fixed'),fixedYears:num('fixedYears'),minRate:num('minRate'),maxRate:num('maxRate'),target:num('target')};
  if(!Number.isFinite(config.amount)||config.amount<=0||config.amount>100000000) throw Error('Enter a loan amount between €1 and €100 million.');
  if(!Number.isInteger(config.term)||config.term<1||config.term>40) throw Error('Choose a loan duration between 1 and 40 years.');
  if(!Number.isFinite(config.fixed)||config.fixed<0||config.fixed>30) throw Error('Fixed interest must be between 0% and 30%.');
  if(config.type==='hybrid'){
    if(!Number.isInteger(config.fixedYears)||config.fixedYears<1||config.fixedYears>config.term) throw Error('Fixed-rate period must be between 1 year and the loan duration.');
    if(!Number.isFinite(config.minRate)||!Number.isFinite(config.maxRate)||config.minRate<0||config.maxRate>30||config.minRate>config.maxRate) throw Error('Enter a variable-rate range between 0% and 30%, with minimum no higher than maximum.');
  }
  config.target=Math.min(config.term,Math.max(1,config.target));
  config.mid=(config.minRate+config.maxRate)/2;
  return config;
}
function calculate(c, targetYears=c.target, overrideRate=null){
  const months=targetYears*12;
  const switchMonth=c.type==='hybrid'?c.fixedYears*12:months;
  let balance=c.amount, interest=0, payment=0, firstPayment=0, afterPayment=null;
  const balances=[balance];
  for(let month=1;month<=months;month++){
    const annualRate=overrideRate===null?(c.type==='hybrid'&&month>switchMonth?c.mid:c.fixed):overrideRate;
    if(month===1||month===switchMonth+1){
      payment=monthlyPayment(balance,annualRate,months-month+1);
      if(month===1)firstPayment=payment;
      else afterPayment=payment;
    }
    const monthlyInterest=balance*annualRate/1200;
    const principal=Math.min(balance,Math.max(0,payment-monthlyInterest));
    balance=Math.max(0,balance-principal);
    interest+=monthlyInterest;
    balances.push(balance);
  }
  return {principal:c.amount,interest,total:c.amount+interest,firstPayment,afterPayment,balances,months};
}
function syncControls(id){
  const term=Number($(id+'-term').value), slider=$(id+'-target');
  if(Number.isInteger(term)&&term>=1&&term<=40){
    slider.max=term;
    if(+slider.value>term)slider.value=term;
    $(id+'-rangeMax').textContent=term+' years';
  }
  $(id+'-targetLabel').textContent=slider.value+' '+(+slider.value===1?'year':'years');
  const hybrid=$(id+'-type').value==='hybrid';
  $(id+'-hybrid').hidden=!hybrid;
  if(hybrid){
    const low=Number($(id+'-minRate').value),high=Number($(id+'-maxRate').value);
    $(id+'-median').textContent=low<=high&&low>=0&&high<=30?'Forecast variable rate: '+((low+high)/2).toFixed(2)+'%':'Enter a valid rate range';
  }
}
function showScenario(id,c,r){
  const baseline=calculate(c,c.term);
  const accelerated=c.target<c.term;
  const transition=r.afterPayment!==null;
  $(id+'-summary').innerHTML=`
    <div class="primary-stat"><div class="stat-label">${accelerated?'Monthly payment for faster payoff':'Estimated monthly payment'}</div><div class="stat-value">${euro(r.firstPayment)}</div><div class="stat-caption">${transition?'During fixed-rate period':'Per month'}${accelerated?' · '+c.target+'-year payoff':''}</div></div>
    <div class="stats-grid">
      ${transition?`<div class="small-stat"><div class="stat-label">After fixed period</div><div class="stat-value">${euro(r.afterPayment)}<span style="font-size:11px;color:#93a5bb"> /mo</span></div></div>`:''}
      <div class="small-stat"><div class="stat-label">Total interest</div><div class="stat-value">${euro(r.interest)}</div></div>
      <div class="small-stat"><div class="stat-label">Total repaid</div><div class="stat-value">${euro(r.total)}</div></div>
      <div class="small-stat"><div class="stat-label">Payoff time</div><div class="stat-value">${c.target} years</div></div>
      ${accelerated?`<div class="small-stat full-stat"><span class="stat-label">Interest saved vs ${c.term}-year schedule</span><span class="stat-value good">${euro(Math.max(0,baseline.interest-r.interest))}</span></div>`:''}
    </div>
    ${transition?'<p class="fine-print">The later monthly payment is an estimate based on your midpoint variable rate, not a guaranteed amount.</p>':''}`;
  return r;
}
function barChart(items){
  const max=Math.max(...items.map(x=>x.r.total),1);
  const single=items.length===1;
  const centers=single?[220]:[130,330];
  const lines=[0,.25,.5,.75,1].map(t=>{
    const y=226-176*t;
    return `<line x1="42" y1="${y}" x2="429" y2="${y}" stroke="#314156" stroke-dasharray="3 5"/><text x="34" y="${y+4}" text-anchor="end" fill="#8191a9" font-size="10">${compact(max*t)}</text>`;
  }).join('');
  const bars=items.map((item,i)=>{
    const x=centers[i]-38, w=76;
    const pH=item.r.principal/max*176,itH=item.r.interest/max*176;
    const base=226;
    return `<rect x="${x}" y="${base-pH}" width="${w}" height="${pH}" rx="2" fill="#4ed2c4"/>
    <rect x="${x}" y="${base-pH-itH}" width="${w}" height="${itH}" rx="2" fill="#f3ae70"/>
    <text x="${centers[i]}" y="${Math.max(19,base-pH-itH-10)}" fill="#e6eef8" text-anchor="middle" font-size="12" font-weight="700">${compact(item.r.total)}</text>
    <text x="${centers[i]}" y="251" fill="#c2cede" text-anchor="middle" font-size="12">Scenario ${item.id.toUpperCase()}</text>`;
  }).join('');
  $('costChart').innerHTML=`<svg viewBox="0 0 455 270" aria-hidden="true">${lines}${bars}</svg>`;
  $('costChart').setAttribute('aria-label',items.map(i=>`Scenario ${i.id.toUpperCase()} principal ${euro(i.r.principal)}, interest ${euro(i.r.interest)}, total ${euro(i.r.total)}`).join('. '));
}
function balanceChart(items){
  const maxBalance=Math.max(...items.map(i=>i.c.amount),1);
  const maxMonths=Math.max(...items.map(i=>i.r.months),12);
  const left=56,right=435,top=24,bottom=226;
  const guides=[0,.25,.5,.75,1].map(t=>{
    const y=bottom-(bottom-top)*t;
    return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#314156" stroke-dasharray="3 5"/><text x="${left-9}" y="${y+4}" text-anchor="end" fill="#8191a9" font-size="10">${compact(maxBalance*t)}</text>`;
  }).join('');
  const ticks=[0,.25,.5,.75,1].map(t=>{
    const x=left+(right-left)*t;
    return `<text x="${x}" y="251" text-anchor="middle" fill="#8191a9" font-size="11">${Math.round(maxMonths/12*t)}y</text>`;
  }).join('');
  const paths=items.map(item=>{
    const points=item.r.balances.map((value,month)=>`${(left+(right-left)*month/maxMonths).toFixed(2)},${(bottom-(bottom-top)*value/maxBalance).toFixed(2)}`).join(' ');
    return `<polyline points="${points}" fill="none" stroke="${item.id==='a'?'#58ddd0':'#ba9bff'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  $('balanceChart').innerHTML=`<svg viewBox="0 0 455 270" aria-hidden="true">${guides}${ticks}${paths}</svg>`;
  $('lineLegend').innerHTML=items.map(item=>`<span><i style="background:${item.id==='a'?'#58ddd0':'#ba9bff'}"></i>Scenario ${item.id.toUpperCase()}</span>`).join('');
  $('balanceChart').setAttribute('aria-label',items.map(i=>`Scenario ${i.id.toUpperCase()} starts at ${euro(i.c.amount)} and pays off in ${i.c.target} years`).join('. '));
}
function render(){
  const comparing=$('compareToggle').checked;
  $('scenarioB').hidden=!comparing;
  $('scenarioGrid').classList.toggle('comparing',comparing);
  const items=[];
  for(const id of (comparing?['a','b']:['a'])){
    syncControls(id);
    try{
      const c=readScenario(id),r=calculate(c);
      showScenario(id,c,r);
      items.push({id,c,r});
    }catch(error){$(id+'-summary').innerHTML='<div class="error">'+esc(error.message)+'</div>';}
  }
  if(comparing&&items.length===2){
    const a=items[0].r,b=items[1].r,diff=Math.abs(a.total-b.total),winner=a.total<=b.total?'A':'B';
    $('compareInsight').hidden=false;
    $('compareInsight').innerHTML=diff<.005?'Both scenarios have the same estimated total repayment.':`<strong>Scenario ${winner} costs ${euro(diff)} less overall.</strong> This compares total repayment (including principal); if loan amounts differ, compare the interest totals as well.`;
  }else{$('compareInsight').hidden=true;}
  if(items.length){barChart(items);balanceChart(items);}else{$('costChart').replaceChildren();$('balanceChart').replaceChildren();$('lineLegend').replaceChildren();}
}
for(const id of ['a','b']){
  // When the contractual term changes, reset the payoff slider to the new term.
  $(id+'-term').addEventListener('change',()=>{
    const term=Number($(id+'-term').value);
    if(Number.isInteger(term)&&term>=1&&term<=40) $(id+'-target').value=term;
    render();
  });
  $(id+'-term').addEventListener('input',render);
  for(const key of ['amount','type','fixed','fixedYears','minRate','maxRate','target']){
    $(id+'-'+key).addEventListener('input',render);
    $(id+'-'+key).addEventListener('change',render);
  }
}
$('compareToggle').addEventListener('change',render);
render();
