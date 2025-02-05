import '@testing-library/cypress/add-commands'

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>
      loginAsSecondUser(): Chainable<void>
      mockClerkAuth(): Chainable<void>
      createThread(name: string): Chainable<void>
      sendMessage(message: string): Chainable<void>
      verifyMessage(message: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('mockClerkAuth', () => {
  cy.intercept('POST', '**/clerk.dev/v1/client/sign_ins*', {
    statusCode: 200,
    body: {
      status: 'complete',
      token: Cypress.env('TEST_USER_TOKEN')
    }
  }).as('signIn')

  cy.intercept('GET', '**/clerk.dev/v1/client/sessions*', {
    statusCode: 200,
    body: {
      sessions: [{
        id: 'test_session',
        status: 'active',
        last_active_at: new Date().toISOString(),
        expire_at: new Date(Date.now() + 86400000).toISOString()
      }]
    }
  }).as('sessions')
})

Cypress.Commands.add('login', () => {
  cy.mockClerkAuth()
  cy.visit('/')
  cy.get('[data-cy=login-button]').click()
  cy.get('[data-cy=email-input]').type(Cypress.env('TEST_USER_EMAIL'))
  cy.get('[data-cy=password-input]').type(Cypress.env('TEST_USER_PASSWORD'))
  cy.get('[data-cy=submit-button]').click()
  cy.wait('@signIn').its('response.statusCode').should('eq', 200)
  cy.url().should('not.include', '/sign-in')
})

Cypress.Commands.add('loginAsSecondUser', () => {
  cy.mockClerkAuth()
  cy.visit('/')
  cy.get('[data-cy=login-button]').click()
  cy.get('[data-cy=email-input]').type(Cypress.env('TEST_USER_2_EMAIL'))
  cy.get('[data-cy=password-input]').type(Cypress.env('TEST_USER_2_PASSWORD'))
  cy.get('[data-cy=submit-button]').click()
  cy.wait('@signIn').its('response.statusCode').should('eq', 200)
  cy.url().should('not.include', '/sign-in')
})

Cypress.Commands.add('createThread', (name: string) => {
  cy.get('[data-cy=new-thread-button]').click()
  cy.get('[data-cy=thread-name-input]').type(name)
  cy.get('[data-cy=create-thread-submit]').click()
  cy.get(`[data-cy=thread-${name}]`).should('exist')
})

Cypress.Commands.add('sendMessage', (message: string) => {
  cy.get('[data-cy=message-input]').type(message)
  cy.get('[data-cy=send-message-button]').click()
})

Cypress.Commands.add('verifyMessage', (message: string) => {
  cy.contains('[data-cy=message-content]', message).should('exist')
}) 