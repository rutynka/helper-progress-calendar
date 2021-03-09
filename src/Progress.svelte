<svelte:options accessors={true} />

<script>
	export let LANG = 'en'
	export let DAYS = 14
	export let show = false
	export let DAYS_BEFORE = 13
	export let localstorage_key = window.location.href

	let today = new Date()
	let css_today = search_date_format(today)
	today.setDate(today.getDate() - DAYS_BEFORE)
	let calendar = init_calendar_day_sequence()

	export const store_progress = function(ev) {
		ev = ev || {}
		set_default(ev)
		if (ev.storeDB) {
			send_progress(ev)
		}
		add_to_local_storage(ev)
		update_calendar(packHitsInaDay(get_storage()))
		show = true;
	};

	console.log('progress helper loaded v0.0.1')

	function set_default(ev) {
		localstorage_key = ev.collectionName ? ev.collectionName : window.location.href
		ev.collectionName = ev.collectionName === undefined ? window.location.href : ev.collectionName
		if (ev.dT === undefined) {
			ev.dT = search_date_format(new Date())
		}
	}

	function send_progress(ev) {
		const progress = {
			'collectionName':ev.collectionName,
			'type':'finish',
			'point':1,
			'percent':100,
			'exerciseTime': typeof(ev) !== 'undefined' && ev.t ? ev.t : bb.get_timer(),
			'correctHit': typeof(ev) !== 'undefined' && ev.correct ? ev.correct : bb.correct_list.length,
			'wrongHit': typeof(ev) !== 'undefined' && ev.wrong ? ev.wrong: bb.correct_list.length,
		};
		const request = new Request(window.allTheFish.api.progressURL, { method: 'PUT' });
		fetch(request, {
			credentials: 'include',
			headers: {
				"Content-Type": "application/json; charset=utf-8",
			},
			body: JSON.stringify(progress)
		}).then(function(response) {
			//console.log(compiled(response.data));
			return response.json();
		});
		console.log('fetch or localstorage')
	}

	function init_calendar_day_sequence() {
		let sequence = []
		let today = new Date()
		today.setDate(today.getDate() - DAYS_BEFORE)
		for (let i = 0; i<DAYS; i++) {

			sequence.push({
				val: 0,
				title: date_format(new Date(today.setDate(today.getDate() + 1))),
				search_date: search_date_format(new Date(today.setDate(today.getDate())))
			})
		}
		return sequence
	}

	function date_format(d) {
		const ye = new Intl.DateTimeFormat(LANG, { year: 'numeric' }).format(d);
		const mo = new Intl.DateTimeFormat(LANG, { month: 'short' }).format(d);
		const da = new Intl.DateTimeFormat(LANG, { day: '2-digit' }).format(d);
		return `${da}-${mo}-${ye}`
	}

	function search_date_format(d) {
		const ye = new Intl.DateTimeFormat(LANG, { year: 'numeric' }).format(d);
		const mo = new Intl.DateTimeFormat(LANG, { month: 'numeric' }).format(d);
		const da = new Intl.DateTimeFormat(LANG, { day: '2-digit' }).format(d);
		return `${ye}-${mo}-${da}`
	}

	function packHitsInaDay(eventsData) {
		let eventByDates = {}
		if (eventsData.length <= 0) {
			console.log('event data not found or invalid localstorage key')
			return {}
		}
		for (let i =0; i<eventsData.length; i++) {
			let dateFromEvent = new Date(eventsData[i].dT.replace(' CET', ''))
			if (isNaN(dateFromEvent.getDate())) {
				continue
			}
			let dateSearchFormat = search_date_format(dateFromEvent)
			if (eventByDates[dateSearchFormat] === undefined) {
				eventByDates[dateSearchFormat] = 1
			} else {
				eventByDates[dateSearchFormat] = eventByDates[dateSearchFormat] < 6 ? eventByDates[dateSearchFormat] + 1 : eventByDates[dateSearchFormat] = 6
			}
			console.log('dT:', dateSearchFormat)
		}
		console.log(eventByDates)
		return eventByDates
	}

	function update_calendar(eventsByDate) {
		let dateEventsKey = Object.keys(eventsByDate)
		for (let i = 0; i< calendar.length; i++) {
			if (dateEventsKey.indexOf(calendar[i].search_date) !== -1) {
				calendar[i].val = eventsByDate[calendar[i].search_date]
			}
		}
	}

	let get_storage = (() => {
		if (!localStorage.getItem(localstorage_key)) {
			return [];
		}
		return JSON.parse(localStorage.getItem(localstorage_key));
	});

	const add_to_local_storage = (ev) => {
		if (ev.collectionName) {
			let storage = get_storage();
			storage.push(ev)
			localStorage.setItem(localstorage_key, JSON.stringify(storage));
		}
	};
</script>

<prgs-calendar class="prgs">
		{#if show}
			<div id="cal"></div>
			{#each calendar as row }
				<div data-cal={row.search_date} title="{row.title}" class="{row.search_date === css_today ? 'today ' : ''}sq big sqc-{row.val}"></div>
			{/each}
			<div class="legend prgs">
				<span>Less</span>
				<div class="sq tiny sqc-0"></div>
				<div class="sq tiny sqc-1"></div>
				<div class="sq tiny sqc-2"></div>
				<div class="sq tiny sqc-3"></div>
				<div class="sq tiny sqc-4"></div>
				<div class="sq tiny sqc-5"></div>
				<div class="sq tiny sqc-6"></div>
				<span>More</span>
			</div>
		{/if}
</prgs-calendar>

<style>
	:root {
		--green-hue: 131;
		--blue-hue: 153;
	}
	span {
		position: relative;
		margin: -4px 4px;
	}
	.prgs {
		display: flex;
		flex-direction: row;
		position:absolute;
		bottom: 20px;
		width: 100%;
		justify-content: center;
		flex-wrap: wrap;
	}
	.prgs.legend {
		bottom: -5px;
		justify-content: flex-end;
	}
	.sq.sqc-0 {
		background-color: hsla(var(--green-hue), 5%, 74%,1);
		border:1px solid hsla(var(--green-hue),  5%, 64%,1);
	}
	.sq.sqc-1 {
		background-color: hsla(var(--green-hue), 75%, 74%,1);
		border:1px solid hsla(var(--green-hue), 65%, 54%,1);
	}
	.sq.sqc-2 {
		background-color: hsla(var(--green-hue), 65%, 64%,1);
		border:1px solid hsla(var(--green-hue), 55%, 54%,1);
	}
	.sq.sqc-3 {
		background-color: hsla(var(--green-hue), 55%, 54%,1);
		border:1px solid hsla(var(--green-hue), 45%, 44%,1);
	}
	.sq.sqc-4 {
		background-color: hsla(var(--green-hue), 45%, 44%,1);
		border:1px solid hsla(var(--green-hue), 35%, 34%,1);
	}
	.sq.sqc-5 {
		background-color: hsla(var(--green-hue), 35%, 34%,1);
		border:1px solid hsla(var(--green-hue), 25%, 24%,1);
	}
	.sq.sqc-6 {
		background-color: hsla(var(--green-hue), 35%, 24%,1);
		border:1px solid hsla(var(--green-hue), 25%, 14%,1);
	}
	.sq {
		height: 30px;
		width: 30px;
		margin: 2px 10px;
		opacity: 0.8;
		border-radius: 3px;
	}
	.today.sq.big {
		border:2px solid hsla(var(--blue-hue), 75%, 74%,1);
	}
	.sq.tiny {
		height: 10px;
		width: 10px;
		margin: 0 2px;
		border-radius: 1px;
	}
	@media only screen and (max-width: 480px) {
		.legend {display:none;}
		.sq {
			margin: 2px 2px;
			height: 15px;
			width: 15px;
		}
	}
</style>