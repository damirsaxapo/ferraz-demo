/* FERRAZ — local-only booking demonstration. No requests or storage. */
(() => {
  'use strict';

  if (window.FerrazBooking) return;

  const services = {
    haircut: { name: 'Мужская стрижка', detail: 'Чёткая форма. Твой характер.' },
    beard: { name: 'Оформление бороды', detail: 'Продуманный контур. Чистые линии.' },
    combo: { name: 'Стрижка + борода', detail: 'Полный образ за один визит.' }
  };
  const timeSlots = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'];
  const fullDate = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const shortDay = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
  const shortMonth = new Intl.DateTimeFormat('ru-RU', { month: 'short' });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let dialog;
  let refs;
  let dates = [];
  let state;
  let opener;
  let closeTimer;
  let openFrame;
  let isClosing = false;
  let startedOnBackdrop = false;

  function motionIsDisabled() {
    return reducedMotion.matches || document.body.classList.contains('motion-off');
  }

  function localDateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')].join('-');
  }

  function makeChoice(name, value, label, detail, className) {
    const item = document.createElement('label');
    item.className = `fb-choice ${className || ''}`;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `ferraz-${name}`;
    input.value = value;
    input.dataset.choice = name;
    const face = document.createElement('span');
    face.className = 'fb-choice-face';
    const title = document.createElement('span');
    title.className = 'fb-choice-label';
    title.textContent = label;
    face.append(title);
    if (detail) {
      const caption = document.createElement('span');
      caption.className = 'fb-choice-detail';
      caption.textContent = detail;
      face.append(caption);
    }
    item.append(input, face);
    return item;
  }

  function createDialog() {
    if (dialog || !document.body) return;
    dialog = document.createElement('dialog');
    dialog.className = 'ferraz-booking';
    dialog.id = 'ferraz-booking';
    dialog.setAttribute('aria-labelledby', 'ferraz-booking-title');
    dialog.setAttribute('aria-describedby', 'ferraz-booking-note');
    dialog.innerHTML = `
      <header class="fb-header">
        <div>
          <p class="fb-eyebrow">FERRAZ / BOOKING DEMO</p>
          <h2 id="ferraz-booking-title" class="fb-title" tabindex="-1" autofocus>Твой следующий визит</h2>
        </div>
        <button class="fb-close" type="button" data-booking-action="close" aria-label="Закрыть демонстрацию записи">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5"/></svg>
        </button>
      </header>
      <div class="fb-scroll">
        <p class="fb-demo-note" id="ferraz-booking-note"><span class="fb-demo-marker" aria-hidden="true"></span>Демонстрация записи. Время примерное, запись в барбершоп не создаётся.</p>
        <ol class="fb-progress" aria-label="Этапы демонстрации">
          <li aria-current="step"><span>01</span> Услуга</li>
          <li><span>02</span> Время</li>
          <li><span>03</span> Проверка</li>
        </ol>
        <section class="fb-panel" data-booking-step="0" aria-labelledby="fb-step-service">
          <h3 class="fb-step-title" id="fb-step-service" tabindex="-1">С чего начнём?</h3>
          <fieldset class="fb-fieldset"><legend class="fb-sr-only">Выберите услугу</legend><div class="fb-services"></div></fieldset>
        </section>
        <section class="fb-panel" data-booking-step="1" aria-labelledby="fb-step-time" hidden>
          <h3 class="fb-step-title" id="fb-step-time" tabindex="-1">Выбери удобный момент</h3>
          <fieldset class="fb-fieldset"><legend class="fb-label">День · ближайшая неделя</legend><div class="fb-days"></div></fieldset>
          <fieldset class="fb-fieldset fb-time-fieldset" disabled><legend class="fb-label">Время · примерные слоты</legend><div class="fb-times"></div></fieldset>
          <p class="fb-hint">Все варианты показаны для примера. Доступность не проверяется.</p>
        </section>
        <section class="fb-panel" data-booking-step="2" aria-labelledby="fb-step-review" hidden>
          <h3 class="fb-step-title" id="fb-step-review" tabindex="-1">Всё как ты хотел?</h3>
          <dl class="fb-review" data-booking-review></dl>
          <p class="fb-hint">Следующий шаг покажет образец подтверждения. Контакты не нужны, заявка не отправляется.</p>
        </section>
        <section class="fb-panel fb-complete" data-booking-step="3" aria-labelledby="fb-step-complete" hidden>
          <div class="fb-complete-icon" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 30 30" fill="none"><path d="m7 15 5 5L23 9" stroke="currentColor" stroke-width="2"/></svg></div>
          <p class="fb-eyebrow">Образец подтверждения</p>
          <h3 class="fb-step-title" id="fb-step-complete" tabindex="-1">Так будет выглядеть подтверждение</h3>
          <dl class="fb-review" data-booking-confirmation></dl>
          <p class="fb-complete-note">Это демонстрация. Заявка не отправлена.</p>
        </section>
      </div>
      <footer class="fb-footer">
        <p class="fb-summary" aria-live="polite" aria-atomic="true">Выбери услугу, чтобы продолжить.</p>
        <div class="fb-actions">
          <button class="fb-button fb-button-back" type="button" data-booking-action="back" hidden><span aria-hidden="true">←</span> Назад</button>
          <button class="fb-button fb-button-next" type="button" data-booking-action="next" disabled><span class="fb-next-label">Выбрать время</span><span class="fb-next-arrow" aria-hidden="true">↗</span></button>
        </div>
      </footer>`;
    document.body.append(dialog);
    refs = {
      scroll: dialog.querySelector('.fb-scroll'),
      services: dialog.querySelector('.fb-services'),
      days: dialog.querySelector('.fb-days'),
      times: dialog.querySelector('.fb-times'),
      timeFieldset: dialog.querySelector('.fb-time-fieldset'),
      panels: Array.from(dialog.querySelectorAll('[data-booking-step]')),
      progress: dialog.querySelector('.fb-progress'),
      progressItems: Array.from(dialog.querySelectorAll('.fb-progress li')),
      summary: dialog.querySelector('.fb-summary'),
      back: dialog.querySelector('[data-booking-action="back"]'),
      next: dialog.querySelector('[data-booking-action="next"]'),
      nextLabel: dialog.querySelector('.fb-next-label'),
      nextArrow: dialog.querySelector('.fb-next-arrow')
    };
    for (const [id, service] of Object.entries(services)) {
      refs.services.append(makeChoice('service', id, service.name, service.detail, 'fb-service'));
    }
    for (const time of timeSlots) refs.times.append(makeChoice('time', time, time, '', 'fb-time'));

    dialog.addEventListener('change', onChoiceChange);
    dialog.addEventListener('click', onDialogClick);
    dialog.addEventListener('pointerdown', (event) => {
      startedOnBackdrop = event.target === dialog && isOutsideDialog(event);
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      close(false);
    });
    dialog.addEventListener('close', () => {
      window.clearTimeout(closeTimer);
      window.cancelAnimationFrame(openFrame);
      dialog.classList.remove('is-open', 'fb-no-motion');
      document.documentElement.classList.remove('ferraz-booking-is-open');
      isClosing = false;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    });
  }

  function refreshDates() {
    const today = new Date();
    dates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index + 1, 12);
      return { date, key: localDateKey(date) };
    });
    refs.days.replaceChildren();
    for (const { date, key } of dates) {
      const choice = makeChoice('day', key, String(date.getDate()), shortDay.format(date), 'fb-day');
      choice.querySelector('input').setAttribute('aria-label', fullDate.format(date));
      const month = document.createElement('span');
      month.className = 'fb-day-month';
      month.textContent = shortMonth.format(date).replace('.', '');
      choice.querySelector('.fb-choice-face').append(month);
      refs.days.append(choice);
    }
  }

  function selectedDay() {
    return dates.find((item) => item.key === state.day);
  }

  function updateReview(container) {
    const service = services[state.service];
    const day = selectedDay();
    container.replaceChildren();
    if (!service || !day || !state.time) return;
    for (const [label, value] of [
      ['Услуга', service.name], ['День', fullDate.format(day.date)], ['Примерное время', state.time]
    ]) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value;
      row.append(term, description);
      container.append(row);
    }
  }

  function update() {
    refs.panels.forEach((panel, index) => { panel.hidden = index !== state.step; });
    refs.progress.hidden = state.step === 3;
    refs.progressItems.forEach((item, index) => {
      if (index === state.step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
      item.classList.toggle('is-done', index < state.step);
    });
    for (const input of dialog.querySelectorAll('input[data-choice]')) {
      input.checked = input.value === state[input.dataset.choice];
    }
    refs.timeFieldset.disabled = !state.day;
    refs.back.hidden = state.step === 0 || state.step === 3;
    refs.next.disabled = state.step === 0 ? !services[state.service]
      : state.step === 1 ? !(selectedDay() && state.time)
        : false;
    refs.nextLabel.textContent = ['Выбрать время', 'Проверить выбор', 'Показать подтверждение', 'Готово'][state.step];
    refs.nextArrow.hidden = state.step === 3;
    refs.summary.hidden = state.step === 3;
    const service = services[state.service];
    const day = selectedDay();
    refs.summary.textContent = service
      ? [service.name, day ? fullDate.format(day.date) : '', state.time ? `в ${state.time}` : ''].filter(Boolean).join(' · ')
      : 'Выбери услугу, чтобы продолжить.';
    if (state.step === 2) updateReview(dialog.querySelector('[data-booking-review]'));
    if (state.step === 3) updateReview(dialog.querySelector('[data-booking-confirmation]'));
  }

  function goToStep(step) {
    state.step = step;
    update();
    refs.scroll.scrollTop = 0;
    refs.panels[step].querySelector('h3').focus({ preventScroll: true });
  }

  function onChoiceChange(event) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.choice) return;
    const choice = input.dataset.choice;
    if (choice === 'service' && services[input.value]) state.service = input.value;
    if (choice === 'day' && dates.some((item) => item.key === input.value)) {
      state.day = input.value;
      state.time = null;
    }
    if (choice === 'time' && state.day && timeSlots.includes(input.value)) state.time = input.value;
    update();
  }

  function isOutsideDialog(event) {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
  }

  function onDialogClick(event) {
    if (event.target === dialog && startedOnBackdrop && isOutsideDialog(event)) {
      close(true);
      return;
    }
    const button = event.target instanceof Element ? event.target.closest('[data-booking-action]') : null;
    if (!button || button.disabled || isClosing) return;
    const action = button.dataset.bookingAction;
    if (action === 'close') close(event.detail !== 0);
    if (action === 'back' && state.step > 0 && state.step < 3) goToStep(state.step - 1);
    if (action === 'next') {
      if (state.step === 3) close(event.detail !== 0);
      else if (state.step === 0 && services[state.service]) goToStep(1);
      else if (state.step === 1 && selectedDay() && timeSlots.includes(state.time)) goToStep(2);
      else if (state.step === 2 && services[state.service] && selectedDay() && timeSlots.includes(state.time)) goToStep(3);
    }
  }

  function close(animate = true) {
    if (!dialog?.open || isClosing) return;
    isClosing = true;
    window.cancelAnimationFrame(openFrame);
    dialog.classList.remove('is-open');
    if (animate && !motionIsDisabled() && !dialog.classList.contains('fb-no-motion')) {
      closeTimer = window.setTimeout(() => dialog.close(), 250);
    } else dialog.close();
  }

  function open(service, trigger, animate = true) {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => open(service, trigger, animate), { once: true });
      return;
    }
    createDialog();
    if (dialog.open && !isClosing) return;
    window.clearTimeout(closeTimer);
    window.cancelAnimationFrame(openFrame);
    isClosing = false;
    opener = trigger || document.activeElement;
    state = { step: 0, service: Object.hasOwn(services, service) ? service : null, day: null, time: null };
    refreshDates();
    update();
    refs.scroll.scrollTop = 0;
    dialog.classList.toggle('fb-no-motion', !animate);
    document.documentElement.classList.add('ferraz-booking-is-open');
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('#ferraz-booking-title').focus({ preventScroll: true });
    if (!animate || motionIsDisabled()) dialog.classList.add('is-open');
    else openFrame = window.requestAnimationFrame(() => {
      openFrame = window.requestAnimationFrame(() => dialog.classList.add('is-open'));
    });
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('[data-book]') : null;
    if (!trigger || trigger.matches(':disabled, [aria-disabled="true"]')) return;
    event.preventDefault();
    open(trigger.dataset.service, trigger, event.detail !== 0);
  });

  window.FerrazBooking = Object.freeze({ open: (service) => open(service), close: () => close() });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createDialog, { once: true });
  else createDialog();
})();
