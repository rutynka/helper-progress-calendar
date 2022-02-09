import { render } from "@testing-library/svelte";
import App from "../Progress.svelte";

test("should render prgs-calendar", () => {
  const results = render(App, {target: document.body,props: {}});
  expect(results.container.querySelector('prgs-calendar').tagName).toBe('PRGS-CALENDAR');
});

// test("should show prgs-calendar element with legend needs localstorage??", () => {
//     const results = render(App, {target: document.body,props: {}});
//     console.log(results.component.store_progress({"exerciseTime":"12","dT":"2022-2-09"}))
//     results.component.store_progress({"exerciseTime":"12","dT":"2022-2-09"})
//     console.log(results.container)
//     expect(results.getByText('prgs').innerHTML).toBeDefined();
// });

test("should match text in the calendar", () => {
  const results = render(App, {target: document.body,props: {}});
  results.component.store_progress({"exerciseTime":"12","dT":"2022-2-09"})
  // console.log(results.container)
  expect(results.container.querySelector('.prgs')).toBeTruthy();
});