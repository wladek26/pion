/* Pion — menu, suwaki przed/po, kalkulator, formularz, mapa. Bez bibliotek. */
(function () {
	'use strict';

	/* ---------- Menu mobilne ---------- */
	var burger = document.querySelector('.pn-burger');
	var nav = document.getElementById('pn-nav');
	if (burger && nav) {
		var setOpen = function (open) {
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
			nav.classList.toggle('is-open', open);
		};
		burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
		nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });
	}

	/* ---------- Suwak przed / po ---------- */
	document.querySelectorAll('.pn-ba').forEach(function (ba) {
		var range = ba.querySelector('.pn-ba__range');
		var set = function (v) {
			v = Math.max(0, Math.min(100, v));
			ba.style.setProperty('--pos', v + '%');
			range.value = Math.round(v);
		};
		var fromEvent = function (e) {
			var r = ba.getBoundingClientRect();
			set(((e.clientX - r.left) / r.width) * 100);
		};
		var dragging = false;
		ba.addEventListener('pointerdown', function (e) {
			if (e.pointerType === 'mouse' && e.button !== 0) return;
			dragging = true;
			ba.classList.add('is-dragging');
			fromEvent(e);
			if (e.pointerType === 'mouse') ba.setPointerCapture(e.pointerId);
		});
		ba.addEventListener('pointermove', function (e) {
			if (dragging) fromEvent(e);
		});
		var stop = function () { dragging = false; ba.classList.remove('is-dragging'); };
		ba.addEventListener('pointerup', stop);
		ba.addEventListener('pointercancel', stop);
		ba.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') stop(); });
		range.addEventListener('input', function () { set(+range.value); });

		// Krótka podpowiedź ruchem, gdy suwak pierwszy raz pojawi się na ekranie.
		if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			var io = new IntersectionObserver(function (entries) {
				if (!entries[0].isIntersecting) return;
				io.disconnect();
				var t0 = null;
				var step = function (t) {
					if (dragging) return;
					if (!t0) t0 = t;
					var p = (t - t0) / 1400;
					if (p >= 1) { set(50); return; }
					set(50 + Math.sin(p * Math.PI * 2) * 14 * (1 - p));
					requestAnimationFrame(step);
				};
				setTimeout(function () { requestAnimationFrame(step); }, 400);
			}, { threshold: 0.6 });
			io.observe(ba);
		}
	});

	/* ---------- Kalkulator ---------- */
	var calc = document.querySelector('.pn-calc');
	if (calc) {
		var cfg = JSON.parse(calc.dataset.config);
		var txt = JSON.parse(calc.dataset.txt);
		var nf = new Intl.NumberFormat(calc.dataset.locale || 'pl-PL', { maximumFractionDigits: 0 });
		var money = function (v) { return nf.format(v) + ' ' + txt.zl; };
		var form = calc.querySelector('.pn-calc__form');
		var areaRange = form.elements.area_range;
		var areaNum = form.elements.area;
		var extrasBox = calc.querySelector('.pn-extras');
		var out = {
			sum: calc.querySelector('[data-out="sum"]'),
			days: calc.querySelector('[data-out="days"]'),
			brk: calc.querySelector('[data-out="break"]')
		};
		var lastSummary = '';
		var typeOf = function () {
			var id = form.querySelector('input[name="type"]:checked').value;
			return cfg.types.filter(function (t) { return t.id === id; })[0];
		};
		var round100 = function (v) { return Math.round(v / 100) * 100; };

		var renderExtras = function (t) {
			extrasBox.innerHTML = '';
			t.extras.forEach(function (x, i) {
				var lab = document.createElement('label');
				var inp = document.createElement('input');
				inp.type = 'checkbox';
				inp.name = 'extra';
				inp.value = i;
				var span = document.createElement('span');
				span.textContent = x.name;
				var price = document.createElement('small');
				price.textContent = '+' + money(x.lab + x.mat) + (x.per_m2 ? '/' + txt.m2 : '');
				lab.appendChild(inp);
				lab.appendChild(span);
				lab.appendChild(price);
				extrasBox.appendChild(lab);
			});
		};

		var setAreaLimits = function (t, reset) {
			[areaRange, areaNum].forEach(function (el) {
				el.min = t.area[0];
				el.max = t.area[1];
				if (reset) el.value = t.area[2];
			});
		};

		var update = function () {
			var t = typeOf();
			var area = Math.max(t.area[0], Math.min(t.area[1], parseFloat(areaNum.value) || t.area[2]));
			var lvl = +form.querySelector('input[name="level"]:checked').value;
			var withMat = form.querySelector('input[name="mat"]:checked').value === '1';
			var lab = t.lab[lvl] * area;
			var mat = withMat ? t.mat[lvl] * area : 0;
			var ext = 0;
			var extNames = [];
			form.querySelectorAll('input[name="extra"]:checked').forEach(function (c) {
				var x = t.extras[+c.value];
				var k = x.per_m2 ? area : 1;
				ext += x.lab * k + (withMat ? x.mat * k : 0);
				extNames.push(x.name);
			});
			var total = lab + mat + ext;
			var lo = round100(total * 0.92);
			var hi = round100(total * 1.12);
			var d0 = Math.round(t.days[0] + t.days[1] * area);
			var d1 = Math.round(d0 * 1.3);

			var sumText = txt.from + ' ' + money(lo) + ' ' + txt.to + ' ' + money(hi);
			if (out.sum.textContent !== sumText) {
				out.sum.textContent = sumText;
				out.sum.parentNode.classList.remove('is-bump');
				void out.sum.parentNode.offsetWidth;
				out.sum.parentNode.classList.add('is-bump');
			}
			out.days.textContent = d0 + '–' + d1 + ' ' + txt.days;
			var rows = [[txt.labour, money(round100(lab))], [txt.materials, withMat ? money(round100(mat)) : txt.own]];
			if (ext) rows.push([txt.extras, money(round100(ext))]);
			out.brk.innerHTML = '';
			rows.forEach(function (r) {
				var dt = document.createElement('dt');
				dt.textContent = r[0];
				var dd = document.createElement('dd');
				dd.textContent = r[1];
				out.brk.appendChild(dt);
				out.brk.appendChild(dd);
			});

			var lvlName = cfg.levels[lvl].name;
			lastSummary = t.name + ', ' + nf.format(area) + ' ' + txt.m2 + ', ' + lvlName + (withMat ? '' : ' (' + txt.own.toLowerCase() + ')') + (extNames.length ? ', + ' + extNames.join(', ') : '') + ': ' + sumText + ', ' + d0 + '–' + d1 + ' ' + txt.days;
		};

		form.addEventListener('change', function (e) {
			if (e.target.name === 'type') {
				var t = typeOf();
				setAreaLimits(t, true);
				renderExtras(t);
			}
			if (e.target.name === 'area') {
				var t2 = typeOf();
				var v = Math.max(t2.area[0], Math.min(t2.area[1], parseFloat(areaNum.value) || t2.area[2]));
				areaNum.value = v;
				areaRange.value = v;
			}
			update();
		});
		areaRange.addEventListener('input', function () { areaNum.value = areaRange.value; update(); });
		areaNum.addEventListener('input', function () {
			if (areaNum.value !== '') areaRange.value = areaNum.value;
			update();
		});

		// Telefon: pasek z ceną na dole ekranu, gdy wynik jest poza ekranem.
		var result = calc.querySelector('.pn-calc__result');
		var peek = document.createElement('a');
		peek.className = 'pn-calc__peek';
		peek.href = '#';
		peek.setAttribute('aria-hidden', 'true');
		peek.tabIndex = -1;
		peek.addEventListener('click', function (e) { e.preventDefault(); result.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
		document.body.appendChild(peek);
		var origUpdate = update;
		update = function () { origUpdate(); peek.textContent = out.sum.textContent + '  ↓'; };
		if ('IntersectionObserver' in window) {
			var vis = { form: false, result: false };
			var io2 = new IntersectionObserver(function (entries) {
				entries.forEach(function (en) { vis[en.target === result ? 'result' : 'form'] = en.isIntersecting; });
				peek.classList.toggle('is-on', vis.form && !vis.result);
			});
			io2.observe(form);
			io2.observe(result);
		}

		var t0 = typeOf();
		setAreaLimits(t0, true);
		renderExtras(t0);
		update();

		// Wynik kalkulatora trafia do formularza pomiaru.
		var send = calc.querySelector('[data-calc-send]');
		if (send) {
			send.addEventListener('click', function () {
				var f = document.getElementById('pomiar');
				if (!f) return;
				var box = f.querySelector('.pn-form__calc');
				box.hidden = false;
				box.querySelector('output').textContent = lastSummary;
				setTimeout(function () { var n = f.querySelector('input[name="name"]'); if (n) n.focus({ preventScroll: true }); }, 450);
			});
		}
	}

	/* ---------- Formularz (demo, nic nie wysyła) ---------- */
	document.querySelectorAll('.pn-form').forEach(function (f) {
		var status = f.querySelector('.pn-form__status');
		f.addEventListener('submit', function (e) {
			e.preventDefault();
			var bad = [];
			['name', 'phone'].forEach(function (n) {
				var el = f.elements[n];
				var ok = n === 'phone' ? el.value.replace(/\D/g, '').length >= 9 : el.value.trim().length > 1;
				el.setAttribute('aria-invalid', ok ? 'false' : 'true');
				if (!ok) bad.push(el);
			});
			var consent = f.elements.consent;
			if (!consent.checked) bad.push(consent);
			status.className = 'pn-form__status';
			if (bad.length) {
				status.textContent = f.dataset.err;
				status.classList.add('is-err');
				bad[0].focus();
				return;
			}
			status.textContent = f.dataset.ok;
			status.classList.add('is-ok');
			f.querySelector('button[type="submit"]').disabled = true;
		});
	});

	/* ---------- Mapa po kliknięciu ---------- */
	document.querySelectorAll('.pn-map').forEach(function (m) {
		var b = m.querySelector('button');
		b.addEventListener('click', function () {
			var i = document.createElement('iframe');
			i.src = m.dataset.src.replace(/&amp;/g, '&');
			i.title = 'OpenStreetMap';
			i.loading = 'lazy';
			m.innerHTML = '';
			m.appendChild(i);
			m.classList.add('is-loaded');
		});
	});
})();
