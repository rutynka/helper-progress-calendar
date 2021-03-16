
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
function noop() { }
function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
        loc: { file, line, column, char }
    };
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_custom_element_data(node, prop, value) {
    if (prop in node) {
        node[prop] = value;
    }
    else {
        attr(node, prop, value);
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function custom_event(type, detail) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, false, false, detail);
    return e;
}

let current_component;
function set_current_component(component) {
    current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

function dispatch_dev(type, detail) {
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
}
function append_dev(target, node) {
    dispatch_dev('SvelteDOMInsert', { target, node });
    append(target, node);
}
function insert_dev(target, node, anchor) {
    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    insert(target, node, anchor);
}
function detach_dev(node) {
    dispatch_dev('SvelteDOMRemove', { node });
    detach(node);
}
function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
        dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
    else
        dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
}
function validate_each_argument(arg) {
    if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
        let msg = '{#each} only iterates over array-like objects.';
        if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
            msg += ' You can use a spread to convert this iterable into an array.';
        }
        throw new Error(msg);
    }
}
function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
        if (!~keys.indexOf(slot_key)) {
            console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
        }
    }
}
/**
 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
 */
class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
        if (!options || (!options.target && !options.$$inline)) {
            throw new Error("'target' is a required option");
        }
        super();
    }
    $destroy() {
        super.$destroy();
        this.$destroy = () => {
            console.warn('Component was already destroyed'); // eslint-disable-line no-console
        };
    }
    $capture_state() { }
    $inject_state() { }
}

/* src/Progress.svelte generated by Svelte v3.35.0 */

const { Object: Object_1, console: console_1 } = globals;
const file = "src/Progress.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[17] = list[i];
	return child_ctx;
}

// (138:2) {#if show}
function create_if_block(ctx) {
	let div0;
	let t0;
	let div8;
	let span0;
	let t2;
	let div1;
	let t3;
	let div2;
	let t4;
	let div3;
	let t5;
	let div4;
	let t6;
	let div5;
	let t7;
	let div6;
	let t8;
	let div7;
	let t9;
	let span1;
	let each_value = /*calendar*/ ctx[1];
	validate_each_argument(each_value);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	const block = {
		c: function create() {
			div0 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t0 = space();
			div8 = element("div");
			span0 = element("span");
			span0.textContent = "Less";
			t2 = space();
			div1 = element("div");
			t3 = space();
			div2 = element("div");
			t4 = space();
			div3 = element("div");
			t5 = space();
			div4 = element("div");
			t6 = space();
			div5 = element("div");
			t7 = space();
			div6 = element("div");
			t8 = space();
			div7 = element("div");
			t9 = space();
			span1 = element("span");
			span1.textContent = "More";
			attr_dev(div0, "id", "cal");
			attr_dev(div0, "class", "days svelte-1mxrhro");
			add_location(div0, file, 138, 3, 4122);
			attr_dev(span0, "class", "svelte-1mxrhro");
			add_location(span0, file, 144, 4, 4373);
			attr_dev(div1, "class", "sq tiny sqc-0 svelte-1mxrhro");
			add_location(div1, file, 145, 4, 4395);
			attr_dev(div2, "class", "sq tiny sqc-1 svelte-1mxrhro");
			add_location(div2, file, 146, 4, 4433);
			attr_dev(div3, "class", "sq tiny sqc-2 svelte-1mxrhro");
			add_location(div3, file, 147, 4, 4471);
			attr_dev(div4, "class", "sq tiny sqc-3 svelte-1mxrhro");
			add_location(div4, file, 148, 4, 4509);
			attr_dev(div5, "class", "sq tiny sqc-4 svelte-1mxrhro");
			add_location(div5, file, 149, 4, 4547);
			attr_dev(div6, "class", "sq tiny sqc-5 svelte-1mxrhro");
			add_location(div6, file, 150, 4, 4585);
			attr_dev(div7, "class", "sq tiny sqc-6 svelte-1mxrhro");
			add_location(div7, file, 151, 4, 4623);
			attr_dev(span1, "class", "svelte-1mxrhro");
			add_location(span1, file, 152, 4, 4661);
			attr_dev(div8, "class", "legend prgs svelte-1mxrhro");
			add_location(div8, file, 143, 3, 4343);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div0, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div0, null);
			}

			insert_dev(target, t0, anchor);
			insert_dev(target, div8, anchor);
			append_dev(div8, span0);
			append_dev(div8, t2);
			append_dev(div8, div1);
			append_dev(div8, t3);
			append_dev(div8, div2);
			append_dev(div8, t4);
			append_dev(div8, div3);
			append_dev(div8, t5);
			append_dev(div8, div4);
			append_dev(div8, t6);
			append_dev(div8, div5);
			append_dev(div8, t7);
			append_dev(div8, div6);
			append_dev(div8, t8);
			append_dev(div8, div7);
			append_dev(div8, t9);
			append_dev(div8, span1);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*calendar, css_today*/ 6) {
				each_value = /*calendar*/ ctx[1];
				validate_each_argument(each_value);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div0, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div0);
			destroy_each(each_blocks, detaching);
			if (detaching) detach_dev(t0);
			if (detaching) detach_dev(div8);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(138:2) {#if show}",
		ctx
	});

	return block;
}

// (140:4) {#each calendar as row }
function create_each_block(ctx) {
	let div;
	let div_data_cal_value;
	let div_title_value;
	let div_class_value;

	const block = {
		c: function create() {
			div = element("div");
			attr_dev(div, "data-cal", div_data_cal_value = /*row*/ ctx[17].search_date);
			attr_dev(div, "title", div_title_value = /*row*/ ctx[17].title);

			attr_dev(div, "class", div_class_value = "" + ((/*row*/ ctx[17].search_date === /*css_today*/ ctx[2]
			? "today "
			: "") + "sq big sqc-" + /*row*/ ctx[17].val + " svelte-1mxrhro"));

			add_location(div, file, 140, 4, 4183);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*calendar*/ 2 && div_data_cal_value !== (div_data_cal_value = /*row*/ ctx[17].search_date)) {
				attr_dev(div, "data-cal", div_data_cal_value);
			}

			if (dirty & /*calendar*/ 2 && div_title_value !== (div_title_value = /*row*/ ctx[17].title)) {
				attr_dev(div, "title", div_title_value);
			}

			if (dirty & /*calendar*/ 2 && div_class_value !== (div_class_value = "" + ((/*row*/ ctx[17].search_date === /*css_today*/ ctx[2]
			? "today "
			: "") + "sq big sqc-" + /*row*/ ctx[17].val + " svelte-1mxrhro"))) {
				attr_dev(div, "class", div_class_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(140:4) {#each calendar as row }",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let prgs_calendar;
	let if_block = /*show*/ ctx[0] && create_if_block(ctx);

	const block = {
		c: function create() {
			prgs_calendar = element("prgs-calendar");
			if (if_block) if_block.c();
			set_custom_element_data(prgs_calendar, "class", "prgs svelte-1mxrhro");
			add_location(prgs_calendar, file, 136, 0, 4077);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, prgs_calendar, anchor);
			if (if_block) if_block.m(prgs_calendar, null);
		},
		p: function update(ctx, [dirty]) {
			if (/*show*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(prgs_calendar, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(prgs_calendar);
			if (if_block) if_block.d();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function send_progress(ev) {
	const progress = {
		"collectionName": ev.collectionName,
		"type": "finish",
		"point": 1,
		"percent": 100,
		"exerciseTime": typeof ev !== "undefined" && ev.t
		? ev.t
		: bb.get_timer(),
		"correctHit": typeof ev !== "undefined" && ev.correct
		? ev.correct
		: bb.correct_list.length,
		"wrongHit": typeof ev !== "undefined" && ev.wrong
		? ev.wrong
		: bb.correct_list.length
	};

	const request = new Request(window.allTheFish.api.progressURL, { method: "PUT" });

	fetch(request, {
		credentials: "include",
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body: JSON.stringify(progress)
	}).then(function (response) {
		//console.log(compiled(response.data));
		return response.json();
	});

	console.log("fetch or localstorage");
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("Progress", slots, []);
	let { LANG = "en" } = $$props;
	let { DAYS = 14 } = $$props;
	let { show = false } = $$props;
	let { DAYS_BEFORE = 13 } = $$props;
	let { localstorage_key = window.location.href } = $$props;
	let today = new Date();
	let css_today = search_date_format(today);
	today.setDate(today.getDate() - DAYS_BEFORE);
	let calendar = init_calendar_day_sequence();

	const store_progress = function (ev) {
		ev = ev || {};
		set_default(ev);

		if (ev.store_db) {
			send_progress(ev);
		}

		add_to_local_storage(ev);
		update_calendar(packHitsInaDay(get_storage()));
		$$invalidate(0, show = true);
	};

	console.log("progress helper loaded v0.0.3");

	function set_default(ev) {
		$$invalidate(3, localstorage_key = ev.collectionName
		? ev.collectionName
		: window.location.href);

		ev.collectionName = ev.collectionName === undefined
		? window.location.href
		: ev.collectionName;

		if (ev.dT === undefined) {
			ev.dT = search_date_format(new Date());
		}
	}

	function init_calendar_day_sequence() {
		let sequence = [];
		let today = new Date();
		today.setDate(today.getDate() - DAYS_BEFORE);

		for (let i = 0; i < DAYS; i++) {
			sequence.push({
				val: 0,
				title: date_format(new Date(today.setDate(today.getDate() + 1))),
				search_date: search_date_format(new Date(today.setDate(today.getDate())))
			});
		}

		return sequence;
	}

	function date_format(d) {
		const ye = new Intl.DateTimeFormat(LANG, { year: "numeric" }).format(d);
		const mo = new Intl.DateTimeFormat(LANG, { month: "short" }).format(d);
		const da = new Intl.DateTimeFormat(LANG, { day: "2-digit" }).format(d);
		return `${da}-${mo}-${ye}`;
	}

	function search_date_format(d) {
		const ye = new Intl.DateTimeFormat(LANG, { year: "numeric" }).format(d);
		const mo = new Intl.DateTimeFormat(LANG, { month: "numeric" }).format(d);
		const da = new Intl.DateTimeFormat(LANG, { day: "2-digit" }).format(d);
		return `${ye}-${mo}-${da}`;
	}

	function packHitsInaDay(eventsData) {
		let eventByDates = {};

		if (eventsData.length <= 0) {
			console.log("event data not found or invalid localstorage key");
			return {};
		}

		for (let i = 0; i < eventsData.length; i++) {
			let dateFromEvent = new Date(eventsData[i].dT.replace(" CET", ""));

			if (isNaN(dateFromEvent.getDate())) {
				continue;
			}

			let dateSearchFormat = search_date_format(dateFromEvent);

			if (eventByDates[dateSearchFormat] === undefined) {
				eventByDates[dateSearchFormat] = 1;
			} else {
				eventByDates[dateSearchFormat] = eventByDates[dateSearchFormat] < 6
				? eventByDates[dateSearchFormat] + 1
				: eventByDates[dateSearchFormat] = 6;
			}

			console.log("dT:", dateSearchFormat);
		}

		console.log(eventByDates);
		return eventByDates;
	}

	function update_calendar(eventsByDate) {
		let dateEventsKey = Object.keys(eventsByDate);

		for (let i = 0; i < calendar.length; i++) {
			if (dateEventsKey.indexOf(calendar[i].search_date) !== -1) {
				$$invalidate(1, calendar[i].val = eventsByDate[calendar[i].search_date], calendar);
			}
		}
	}

	let get_storage = () => {
		if (!localStorage.getItem(localstorage_key)) {
			return [];
		}

		return JSON.parse(localStorage.getItem(localstorage_key));
	};

	const add_to_local_storage = ev => {
		if (ev.collectionName) {
			let storage = get_storage();
			storage.push(ev);
			localStorage.setItem(localstorage_key, JSON.stringify(storage));
		}
	};

	const writable_props = ["LANG", "DAYS", "show", "DAYS_BEFORE", "localstorage_key"];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Progress> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("LANG" in $$props) $$invalidate(4, LANG = $$props.LANG);
		if ("DAYS" in $$props) $$invalidate(5, DAYS = $$props.DAYS);
		if ("show" in $$props) $$invalidate(0, show = $$props.show);
		if ("DAYS_BEFORE" in $$props) $$invalidate(6, DAYS_BEFORE = $$props.DAYS_BEFORE);
		if ("localstorage_key" in $$props) $$invalidate(3, localstorage_key = $$props.localstorage_key);
	};

	$$self.$capture_state = () => ({
		LANG,
		DAYS,
		show,
		DAYS_BEFORE,
		localstorage_key,
		today,
		css_today,
		calendar,
		store_progress,
		set_default,
		send_progress,
		init_calendar_day_sequence,
		date_format,
		search_date_format,
		packHitsInaDay,
		update_calendar,
		get_storage,
		add_to_local_storage
	});

	$$self.$inject_state = $$props => {
		if ("LANG" in $$props) $$invalidate(4, LANG = $$props.LANG);
		if ("DAYS" in $$props) $$invalidate(5, DAYS = $$props.DAYS);
		if ("show" in $$props) $$invalidate(0, show = $$props.show);
		if ("DAYS_BEFORE" in $$props) $$invalidate(6, DAYS_BEFORE = $$props.DAYS_BEFORE);
		if ("localstorage_key" in $$props) $$invalidate(3, localstorage_key = $$props.localstorage_key);
		if ("today" in $$props) today = $$props.today;
		if ("css_today" in $$props) $$invalidate(2, css_today = $$props.css_today);
		if ("calendar" in $$props) $$invalidate(1, calendar = $$props.calendar);
		if ("get_storage" in $$props) get_storage = $$props.get_storage;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		show,
		calendar,
		css_today,
		localstorage_key,
		LANG,
		DAYS,
		DAYS_BEFORE,
		store_progress
	];
}

class Progress extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance, create_fragment, safe_not_equal, {
			LANG: 4,
			DAYS: 5,
			show: 0,
			DAYS_BEFORE: 6,
			localstorage_key: 3,
			store_progress: 7
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Progress",
			options,
			id: create_fragment.name
		});
	}

	get LANG() {
		return this.$$.ctx[4];
	}

	set LANG(LANG) {
		this.$set({ LANG });
		flush();
	}

	get DAYS() {
		return this.$$.ctx[5];
	}

	set DAYS(DAYS) {
		this.$set({ DAYS });
		flush();
	}

	get show() {
		return this.$$.ctx[0];
	}

	set show(show) {
		this.$set({ show });
		flush();
	}

	get DAYS_BEFORE() {
		return this.$$.ctx[6];
	}

	set DAYS_BEFORE(DAYS_BEFORE) {
		this.$set({ DAYS_BEFORE });
		flush();
	}

	get localstorage_key() {
		return this.$$.ctx[3];
	}

	set localstorage_key(localstorage_key) {
		this.$set({ localstorage_key });
		flush();
	}

	get store_progress() {
		return this.$$.ctx[7];
	}

	set store_progress(value) {
		throw new Error("<Progress>: Cannot set read-only property 'store_progress'");
	}
}

const prgs = new Progress({
	target: document.body,
	// target: document.body.getElementsByTagName('main')[0],
	// anchor: document.getElementById('userContent'),
	props: {
	}
});

export default prgs;
