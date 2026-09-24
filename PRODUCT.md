# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The main users are burger restaurant employees and the people managing the venues. An employee uses the app while preparing or closing a shift to enter data and generate the daily operational list. A manager uses the admin panel to review revenue, working hours, products, and saved reports.

## Product Purpose

Burbone helps run the daily operations of a burger restaurant: create daily lists from current data, save them, and analyze venue results. Success means an employee quickly generating a correct list and a manager getting a clear, practical view of the data.

## Positioning

The product combines a generator of daily operational lists with an admin panel covering revenue, employee hours, the product catalog, and saved reports. It is one tool for shift work and for later review of the results.

## Operating Context

The system is used at burger restaurant venues, during daily shifts and administrative work. Employees enter data about revenue, the team, burgers, and ingredients, then copy or save the list. Administration reviews data by location and date range and uses reports and the payslip calculator.

## Capabilities and Constraints

- The interface and user-facing content are in Polish.
- The app is a static web page built on HTML, CSS, and JavaScript modules with no bundler.
- The main surfaces are the generator `index.html` and the admin panel `admin.html`.
- Report data uses the `dd.mm.yyyy` date format, and form dates use the ISO `yyyy-mm-dd` format.
- The app runs on GitHub Pages; a local dev server handles JSON `PUT` writes.
- Existing features, data structure, locations, report formats, and the behavior of current controls must be preserved.
- The generator can handle a temporary one-shift employee; that employee is not persisted.
- The interface should remain usable on desktop and mobile screens.

## Brand Commitments

- Product name: Burbone.
- The current brand palette and color aliases in `css/theme/palette.css` are binding.
- The interface must keep its calm, utilitarian character: an Atlassian-style dark dashboard tailored to the warm brand palette.
- Use the existing typography system, tokens, and Material Symbols icons.

## Evidence on Hand

- The current generator and admin panel: `index.html`, `admin.html`.
- Existing JavaScript modules, styles, and tokens in the `js/` and `css/` directories.
- Product and report data in the `database/` directory.
- Local dev server: `dev-server.js`.
- No confirmed external references, testimonials, or marketing materials; do not create them without approval.

## Product Principles

- Daily shift work must be fast and error-free.
- Operational data should be readable without extra interpretation.
- The generator and administration should form one coherent workflow.
- Visual changes must not break existing features or data.
- The interface should support work on both a computer and a phone.

## Accessibility & Inclusion

The product should keep accessible control labels, logical keyboard support, readable contrast, and a responsive layout. Detailed user needs have not yet been confirmed.
