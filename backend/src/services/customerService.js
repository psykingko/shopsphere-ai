const customerRepository = require('../repositories/customerRepository');

/**
 * Fetches the full customer profile including addresses.
 * 
 * @param {string} customerId 
 * @returns {Promise<Object|null>}
 */
async function getCustomerProfile(customerId) {
    const customer = await customerRepository.getCustomerById(customerId);
    
    if (!customer) {
        return null;
    }

    const addresses = await customerRepository.getCustomerAddresses(customerId);
    
    // Construct the unified domain model response
    return {
        ...customer,
        addresses: addresses
    };
}

module.exports = {
    getCustomerProfile
};
