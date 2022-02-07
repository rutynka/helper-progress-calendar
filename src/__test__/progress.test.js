import { render } from "@testing-library/svelte";
import App from "../Progress.svelte";

test("should render prgs-calendar", () => {
  const results = render(App, {target: document.body,props: {}});

  expect(() => results.queryByText('prgs-calendar')).not.toThrow();
});
