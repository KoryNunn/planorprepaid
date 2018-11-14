var fastn = require('./fastn');
var scrollIntoView = require('scroll-into-view');
var blazon = require('blazon');
var lzutf8 = require('lzutf8');
var { Maybe, Cast } = blazon;

var model = new fastn.Model({
    errors: {},
    interestRate: 4,
    costPerMonth: 0,
    lengthOfPlanInMonths: 0,
    costOfPhone: 0,
    prepaidCostPerMonth: 0
});

try {
    var hashSource = window.location.hash.slice(1);
    hashSource = lzutf8.decompress(hashSource, {inputEncoding: 'Base64', outputEncoding: 'String'});
    model.update(JSON.parse(hashSource));
} catch (error) {}

var maybeNumber = blazon(Maybe(Cast(Number), 0));

model.on('*.*', function(){
    var stateString = JSON.stringify(model.get('.'));
    window.location.hash = '#' + lzutf8.compress(stateString, {outputEncoding: 'Base64'});
});

var planTotalCost = fastn.binding('costPerMonth', 'lengthOfPlanInMonths', (cost, months) =>
    (cost * months).toFixed(2)
);

var prepaidOutrightTotalBeforeInterest = fastn.binding('prepaidCostPerMonth', 'lengthOfPlanInMonths', 'costOfPhone',
    (cost, months, phoneCost) => cost * months + phoneCost
);

var opportunityCost = fastn.binding('lengthOfPlanInMonths', 'interestRate', prepaidOutrightTotalBeforeInterest, (months, interestRate, cost) =>
    cost * (interestRate && (Math.pow((interestRate / 100), months / 12)) / (interestRate / 100))
);

var prepaidOutrightTotalCost = fastn.binding(prepaidOutrightTotalBeforeInterest, opportunityCost, (cost, opportunityCost) =>
    (cost + opportunityCost).toFixed(2)
);

function setNumber(event){
    var fieldName = event.target.previousSibling.textContent;
    try {
        this.value(maybeNumber(event.target.value));
        model.remove(`errors.${fieldName}`);
    } catch (error) {
        model.set(`errors.${fieldName}`, error.message);
    }
}

var ui = fastn('div', { class: 'content' },
    fastn('span', { class: 'madeBy' }, 'Made by', fastn('a', { href: 'https://korynunn.com' }, 'Kory Nunn')),
    fastn('h1', { class: 'pageHeading' }, 'How should you pay for your next phone?'),
    fastn('section',
        fastn('h2', 'Should you buy your next phone on a contract or outright + prepaid?')
    ),
    fastn('field', { class: 'name' },
        fastn('label', 'Comparison name'),
        fastn('input', {
            placeholder: 'My next phone',
            value: fastn.binding('name'),
            onkeyup: 'value:value'
        })
    ),
    fastn('pre', { class: 'errors' }, fastn.binding('errors|*', errors => Object.keys(errors)
        .map(fieldName => `${fieldName} should be a number.`)
        .join('\n')
    )),
    fastn('div', { class: 'options' },
        fastn('div', {
            class: fastn.binding(planTotalCost, prepaidOutrightTotalCost, (plan, prePaid) =>
                [
                    parseFloat(plan) > parseFloat(prePaid) ? 'loser' : 'winner',
                    'option column plan'
                ]
            )
        },
            fastn('h1', 'On a plan'),
            fastn('field', { class: 'costPerMonth' },
                fastn('label', 'Cost per month'),
                fastn('input', {
                    placeholder: '$',
                    value: fastn.binding('costPerMonth')
                })
                .on('keyup', setNumber)
            ),
            fastn('field', { class: 'lengthOfPlanInMonths' },
                fastn('label', 'Length of plan in months'),
                fastn('input', {
                    placeholder: 'months',
                    value: fastn.binding('lengthOfPlanInMonths')
                })
                .on('keyup', setNumber)
            ),
            fastn('div', { class: 'results' },
                fastn('h2', 'Total spend: '),
                fastn('h3', { class: 'result' },
                    '$',
                    planTotalCost
                )
            )
        ),
        fastn('div', {
            class: fastn.binding(planTotalCost, prepaidOutrightTotalCost, (plan, prePaid) =>
                [
                    parseFloat(plan) < parseFloat(prePaid) ? 'loser' : 'winner',
                    'column prepaidOutright'
                ]
            )
        },
            fastn('div', { class: 'options' },
                fastn('div', { class: 'option prePaid' },
                    fastn('h1', 'Pre-Paid'),
                    fastn('field', { class: 'prepaidCostPerMonth' },
                        fastn('label', 'Cost per month'),
                        fastn('input', {
                            placeholder: '$',
                            value: fastn.binding('prepaidCostPerMonth')
                        })
                        .on('keyup', setNumber)
                    ),
                    fastn('h3',
                        'Total spend: ',
                        '$', fastn.binding('prepaidCostPerMonth', 'lengthOfPlanInMonths', (cost, months) =>
                            cost * months
                        )
                    )
                ),
                fastn('div', { class: 'option outright' },
                    fastn('h1', 'Outright'),
                    fastn('field', { class: 'costOfPhone' },
                        fastn('label', 'Cost of phone'),
                        fastn('input', {
                            placeholder: '$',
                            value: fastn.binding('costOfPhone')
                        })
                        .on('keyup', setNumber)
                    ),
                    fastn('h3',
                        'Total spend: ',
                        '$', fastn.binding('costOfPhone')
                    )
                )
            ),
            fastn('div', { class: 'option opportunityCost' },
                fastn('h2', 'Opertunity cost: '),
                fastn('field', { class: 'interestRate' },
                    fastn('label',
                        'Interest rate',
                        fastn('button', 'What do i put here?')
                        .on('click', () => {
                            scrollIntoView(document.querySelector('.interestExplaination'));
                        })
                    ),
                    fastn('input', {
                        placeholder: '%',
                        value: fastn.binding('interestRate')
                    })
                    .on('keyup', setNumber)
                ),
                fastn('h3',
                    '$',
                    fastn.binding(opportunityCost, cost => (cost || 0).toFixed(2))
                )
            ),
            fastn('div', { class: 'results option prepaidOutright' },
                fastn('h2', 'Combined: '),
                fastn('h3', { class: 'result' },
                    '$', prepaidOutrightTotalCost
                )
            )
        )
    ),
    fastn('section', { class: 'interestExplaination' },
        fastn('h2', 'Interest:'),
        fastn('ul',
            fastn('li', 'If you are buying with cash, you lose the opertunity to earn interest on your savings. Enter the interest you expect to earn per year.'),
            fastn('li', 'If you are buying with credit, enter the interest rate on the credit card or loan.'),
            fastn('li', 'If you are buying with interest-free credit, enter 0, you lose nothing! :D')
        )
    )
)
.attach(model)
.render();

window.addEventListener('load', () => document.body.appendChild(ui.element));