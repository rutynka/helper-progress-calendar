
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
        node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
    }
    else {
        attr(node, prop, value);
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function custom_event(type, detail, bubbles = false) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, false, detail);
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
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
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
    seen_callbacks.clear();
    set_current_component(saved_component);
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
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
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
    document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.4' }, detail), true));
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
function set_data_dev(text, data) {
    data = '' + data;
    if (text.wholeText === data)
        return;
    dispatch_dev('SvelteDOMSetData', { node: text, data });
    text.data = data;
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

/* src/Progress.svelte generated by Svelte v3.46.4 */

const { Object: Object_1, console: console_1 } = globals;
const file = "src/Progress.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[20] = list[i];
	return child_ctx;
}

// (166:1) {#if show}
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
	let each_value = /*calendar*/ ctx[2];
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
			attr_dev(div0, "class", "days svelte-s4yqd6");
			add_location(div0, file, 166, 2, 5035);
			add_location(span0, file, 176, 3, 5361);
			attr_dev(div1, "class", "sq tiny sqc-0 svelte-s4yqd6");
			add_location(div1, file, 177, 3, 5382);
			attr_dev(div2, "class", "sq tiny sqc-1 svelte-s4yqd6");
			add_location(div2, file, 178, 3, 5419);
			attr_dev(div3, "class", "sq tiny sqc-2 svelte-s4yqd6");
			add_location(div3, file, 179, 3, 5456);
			attr_dev(div4, "class", "sq tiny sqc-3 svelte-s4yqd6");
			add_location(div4, file, 180, 3, 5493);
			attr_dev(div5, "class", "sq tiny sqc-4 svelte-s4yqd6");
			add_location(div5, file, 181, 3, 5530);
			attr_dev(div6, "class", "sq tiny sqc-5 svelte-s4yqd6");
			add_location(div6, file, 182, 3, 5567);
			attr_dev(div7, "class", "sq tiny sqc-6 svelte-s4yqd6");
			add_location(div7, file, 183, 3, 5604);
			add_location(span1, file, 184, 3, 5641);
			attr_dev(div8, "class", "legend prgs svelte-s4yqd6");
			add_location(div8, file, 175, 2, 5332);
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
			if (dirty & /*calendar, css_today, show_time*/ 14) {
				each_value = /*calendar*/ ctx[2];
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
		source: "(166:1) {#if show}",
		ctx
	});

	return block;
}

// (170:3) {#if row.eT && show_time }
function create_if_block_1(ctx) {
	let span;
	let t_value = /*row*/ ctx[20].eT + "";
	let t;

	const block = {
		c: function create() {
			span = element("span");
			t = text(t_value);
			attr_dev(span, "class", "sec svelte-s4yqd6");
			add_location(span, file, 170, 4, 5257);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*calendar*/ 4 && t_value !== (t_value = /*row*/ ctx[20].eT + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(span);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(170:3) {#if row.eT && show_time }",
		ctx
	});

	return block;
}

// (168:3) {#each calendar as row }
function create_each_block(ctx) {
	let div;
	let t;
	let div_data_cal_value;
	let div_title_value;
	let div_class_value;
	let if_block = /*row*/ ctx[20].eT && /*show_time*/ ctx[1] && create_if_block_1(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if (if_block) if_block.c();
			t = space();
			attr_dev(div, "data-cal", div_data_cal_value = /*row*/ ctx[20].search_date);
			attr_dev(div, "title", div_title_value = /*row*/ ctx[20].title);

			attr_dev(div, "class", div_class_value = "" + ((/*row*/ ctx[20].search_date === /*css_today*/ ctx[3]
			? 'today '
			: '') + "sq big sqc-" + /*row*/ ctx[20].val + " svelte-s4yqd6"));

			add_location(div, file, 168, 3, 5094);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if (if_block) if_block.m(div, null);
			append_dev(div, t);
		},
		p: function update(ctx, dirty) {
			if (/*row*/ ctx[20].eT && /*show_time*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_1(ctx);
					if_block.c();
					if_block.m(div, t);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*calendar*/ 4 && div_data_cal_value !== (div_data_cal_value = /*row*/ ctx[20].search_date)) {
				attr_dev(div, "data-cal", div_data_cal_value);
			}

			if (dirty & /*calendar*/ 4 && div_title_value !== (div_title_value = /*row*/ ctx[20].title)) {
				attr_dev(div, "title", div_title_value);
			}

			if (dirty & /*calendar*/ 4 && div_class_value !== (div_class_value = "" + ((/*row*/ ctx[20].search_date === /*css_today*/ ctx[3]
			? 'today '
			: '') + "sq big sqc-" + /*row*/ ctx[20].val + " svelte-s4yqd6"))) {
				attr_dev(div, "class", div_class_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) detach_dev(div);
			if (if_block) if_block.d();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(168:3) {#each calendar as row }",
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
			set_custom_element_data(prgs_calendar, "class", "prgs svelte-s4yqd6");
			add_location(prgs_calendar, file, 164, 0, 4992);
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
		'collectionName': ev.collectionName,
		'type': 'finish',
		'point': 1,
		'percent': 100,
		'exerciseTime': typeof ev !== 'undefined' && ev.t
		? ev.t
		: bb.get_timer(),
		'correctHit': typeof ev !== 'undefined' && ev.correct
		? ev.correct
		: bb.correct_list.length,
		'wrongHit': typeof ev !== 'undefined' && ev.wrong
		? ev.wrong
		: bb.correct_list.length
	};

	const request = new Request(window.allTheFish.api.progressURL, { method: 'PUT' });

	fetch(request, {
		credentials: 'include',
		headers: {
			"Content-Type": "application/json; charset=utf-8"
		},
		body: JSON.stringify(progress)
	}).then(function (response) {
		//console.log(compiled(response.data));
		return response.json();
	});

	console.log('fetch or localstorage');
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Progress', slots, []);
	let { lang = 'en' } = $$props;
	let { show = false } = $$props;
	let { show_time = true } = $$props;
	let { visible_days = 14 } = $$props;
	let { days_before_today = 13 } = $$props;
	let { localstorage_key = window.location.href } = $$props;
	let eventsBestTime = {};
	let today = new Date();
	let css_today = search_date_format(today);
	today.setDate(today.getDate() - days_before_today);
	let calendar = init_calendar_day_sequence();

	const store_progress = function (ev) {
		ev = ev ?? {};
		set_default(ev);

		if (ev.store_db) {
			send_progress(ev);
		}

		add_to_local_storage(ev);
		merge_hit_days_with_calendar_view(pack_hits_in_a_day(get_storage()));
		$$invalidate(0, show = true);
		return true;
	};

	console.log('progress helper loaded v0.1.1');

	function set_default(ev) {
		$$invalidate(4, localstorage_key = ev.collectionName
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
		today.setDate(today.getDate() - days_before_today);

		for (let i = 0; i < visible_days; i++) {
			sequence.push({
				val: 0,
				sec: 0,
				title: date_format(new Date(today.setDate(today.getDate() + 1))),
				search_date: search_date_format(new Date(today.setDate(today.getDate())))
			});
		}

		return sequence;
	}

	function date_format(d) {
		const ye = new Intl.DateTimeFormat(lang, { year: 'numeric' }).format(d);
		const mo = new Intl.DateTimeFormat(lang, { month: 'short' }).format(d);
		const da = new Intl.DateTimeFormat(lang, { day: '2-digit' }).format(d);
		return `${da}-${mo}-${ye}`;
	}

	function search_date_format(d) {
		const ye = new Intl.DateTimeFormat(lang, { year: 'numeric' }).format(d);
		const mo = new Intl.DateTimeFormat(lang, { month: 'numeric' }).format(d);
		const da = new Intl.DateTimeFormat(lang, { day: '2-digit' }).format(d);
		return `${ye}-${mo}-${da}`;
	}

	function pack_hits_in_a_day(eventsData) {
		let eventByDates = {};

		if (eventsData.length <= 0) {
			console.log('event data not found or invalid localstorage key');
			return {};
		}

		for (let i = 0; i < eventsData.length; i++) {
			let dateFromEvent = new Date(eventsData[i].dT.replace(' CET', ''));

			if (isNaN(dateFromEvent.getDate())) {
				continue;
			}

			let dateSearchFormat = search_date_format(dateFromEvent);
			let eT = get_best_time(eventsData[i], dateSearchFormat);

			if (eventByDates[dateSearchFormat] === undefined) {
				eventByDates[dateSearchFormat] = { hit: 1, eT };
			} else {
				eventByDates[dateSearchFormat]['hit'] = eventByDates[dateSearchFormat]['hit'] < 6
				? eventByDates[dateSearchFormat]['hit'] + 1
				: eventByDates[dateSearchFormat] = { hit: 7 };

				eventByDates[dateSearchFormat]['eT'] = eT;
			}
		} // console.log('dT:', dateSearchFormat)

		console.log(eventByDates);
		return eventByDates;
	}

	function get_best_time(rawEventsData, dateKey) {
		let bestTime = 0;
		let exerciseTime = parseInt(rawEventsData['exerciseTime']);

		if (exerciseTime && exerciseTime !== 0) {
			if (eventsBestTime[dateKey]) {
				bestTime = eventsBestTime[dateKey] > exerciseTime
				? exerciseTime
				: eventsBestTime[dateKey];
			} else {
				bestTime = exerciseTime;
			}

			eventsBestTime[dateKey] = bestTime;
		} else {
			if (eventsBestTime[dateKey]) {
				bestTime = eventsBestTime[dateKey];
			}
		}

		// console.log(bestTime)
		return bestTime;
	}

	function merge_hit_days_with_calendar_view(eventsByDate) {
		let dateEventsKey = Object.keys(eventsByDate);

		for (let i = 0; i < calendar.length; i++) {
			if (dateEventsKey.indexOf(calendar[i].search_date) !== -1) {
				$$invalidate(2, calendar[i].val = eventsByDate[calendar[i].search_date]['hit'], calendar);
				$$invalidate(2, calendar[i].eT = eventsByDate[calendar[i].search_date]['eT'], calendar);
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

	const writable_props = [
		'lang',
		'show',
		'show_time',
		'visible_days',
		'days_before_today',
		'localstorage_key'
	];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Progress> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('lang' in $$props) $$invalidate(5, lang = $$props.lang);
		if ('show' in $$props) $$invalidate(0, show = $$props.show);
		if ('show_time' in $$props) $$invalidate(1, show_time = $$props.show_time);
		if ('visible_days' in $$props) $$invalidate(6, visible_days = $$props.visible_days);
		if ('days_before_today' in $$props) $$invalidate(7, days_before_today = $$props.days_before_today);
		if ('localstorage_key' in $$props) $$invalidate(4, localstorage_key = $$props.localstorage_key);
	};

	$$self.$capture_state = () => ({
		lang,
		show,
		show_time,
		visible_days,
		days_before_today,
		localstorage_key,
		eventsBestTime,
		today,
		css_today,
		calendar,
		store_progress,
		set_default,
		send_progress,
		init_calendar_day_sequence,
		date_format,
		search_date_format,
		pack_hits_in_a_day,
		get_best_time,
		merge_hit_days_with_calendar_view,
		get_storage,
		add_to_local_storage
	});

	$$self.$inject_state = $$props => {
		if ('lang' in $$props) $$invalidate(5, lang = $$props.lang);
		if ('show' in $$props) $$invalidate(0, show = $$props.show);
		if ('show_time' in $$props) $$invalidate(1, show_time = $$props.show_time);
		if ('visible_days' in $$props) $$invalidate(6, visible_days = $$props.visible_days);
		if ('days_before_today' in $$props) $$invalidate(7, days_before_today = $$props.days_before_today);
		if ('localstorage_key' in $$props) $$invalidate(4, localstorage_key = $$props.localstorage_key);
		if ('eventsBestTime' in $$props) eventsBestTime = $$props.eventsBestTime;
		if ('today' in $$props) today = $$props.today;
		if ('css_today' in $$props) $$invalidate(3, css_today = $$props.css_today);
		if ('calendar' in $$props) $$invalidate(2, calendar = $$props.calendar);
		if ('get_storage' in $$props) get_storage = $$props.get_storage;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		show,
		show_time,
		calendar,
		css_today,
		localstorage_key,
		lang,
		visible_days,
		days_before_today,
		store_progress
	];
}

class Progress extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(this, options, instance, create_fragment, safe_not_equal, {
			lang: 5,
			show: 0,
			show_time: 1,
			visible_days: 6,
			days_before_today: 7,
			localstorage_key: 4,
			store_progress: 8
		});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Progress",
			options,
			id: create_fragment.name
		});
	}

	get lang() {
		return this.$$.ctx[5];
	}

	set lang(lang) {
		this.$$set({ lang });
		flush();
	}

	get show() {
		return this.$$.ctx[0];
	}

	set show(show) {
		this.$$set({ show });
		flush();
	}

	get show_time() {
		return this.$$.ctx[1];
	}

	set show_time(show_time) {
		this.$$set({ show_time });
		flush();
	}

	get visible_days() {
		return this.$$.ctx[6];
	}

	set visible_days(visible_days) {
		this.$$set({ visible_days });
		flush();
	}

	get days_before_today() {
		return this.$$.ctx[7];
	}

	set days_before_today(days_before_today) {
		this.$$set({ days_before_today });
		flush();
	}

	get localstorage_key() {
		return this.$$.ctx[4];
	}

	set localstorage_key(localstorage_key) {
		this.$$set({ localstorage_key });
		flush();
	}

	get store_progress() {
		return this.$$.ctx[8];
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

export { prgs as default };
