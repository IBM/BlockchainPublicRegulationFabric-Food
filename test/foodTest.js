/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
/**
 * Write the unit tests for your transction processor functions here
 */
const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const {
  BusinessNetworkDefinition,
  CertificateUtil,
  IdCard
} = require('composer-common');
const path = require('path');
const chai = require('chai');
chai.should();
chai.use(require('chai-as-promised'));
const namespace = 'composer.food.supply';
describe('#' + namespace, () => {
  // Embedded connection used for local testing
  const connectionProfile = {
    name: 'embedded',
    'x-type': 'embedded'
  };
  // Name of the business network card containing the administrative identity for the business network
  const adminCardName = 'admin';
  // Admin connection to the blockchain, used to deploy the business network
  let adminConnection;
  // This is the business network connection the tests will use.
  let businessNetworkConnection;
  // This is the factory for creating instances of types.
  let factory;
  // These are the identities for Alice and Bob.
  const importerCardName = 'importer';
  const retailerCardName = 'retailer';
  const regulatorCardName = 'regulator';
  const supplierCardName = 'supplier';
  // These are a list of receieved events.
  let events;
  let businessNetworkName;
  before(async () => {
    // Generate certificates for use with the embedded connection
    const credentials = CertificateUtil.generate({
      commonName: 'admin'
    });
    // Identity used with the admin connection to deploy business networks
    const deployerMetadata = {
      version: 1,
      userName: 'PeerAdmin',
      roles: ['PeerAdmin', 'ChannelAdmin']
    };
    const deployerCard = new IdCard(deployerMetadata, connectionProfile);
    deployerCard.setCredentials(credentials);
    const deployerCardName = 'PeerAdmin';

    adminConnection = new AdminConnection();
    await adminConnection.importCard(deployerCardName, deployerCard);
    await adminConnection.connect(deployerCardName);
  });
  /**
   *
   * @param {String} cardName The card name to use for this identity
   * @param {Object} identity The identity details
   */
  async function importCardForIdentity(cardName, identity) {
    const metadata = {
      userName: identity.userID,
      version: 1,
      enrollmentSecret: identity.userSecret,
      businessNetwork: businessNetworkName
    };
    const card = new IdCard(metadata, connectionProfile);
    await adminConnection.importCard(cardName, card);
  }
  // This is called before each test is executed.
  beforeEach(async () => {
    // Generate a business network definition from the project directory.
    let businessNetworkDefinition = await BusinessNetworkDefinition.fromDirectory(path.resolve(__dirname, '..'));
    businessNetworkName = businessNetworkDefinition.getName();
    await adminConnection.install(businessNetworkDefinition);
    const startOptions = {
      networkAdmins: [{
        userName: 'admin',
        enrollmentSecret: 'adminpw'
      }]
    };
    const adminCards = await adminConnection.start(businessNetworkName, businessNetworkDefinition.getVersion(), startOptions);
    await adminConnection.importCard(adminCardName, adminCards.get('admin'));
    // Create and establish a business network connection
    businessNetworkConnection = new BusinessNetworkConnection();
    events = [];
    businessNetworkConnection.on('event', event => {
      events.push(event);
    });
    await businessNetworkConnection.connect(adminCardName);
    // Get the factory for the business network.
    const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
    /////////
    // create supplier
    const supplier = factory.newResource(namespace, 'Supplier', 'supplier@acme.org');
    supplier.countryId = 'UK';
    supplier.orgId = 'XYZ Corp';
    // create importer
    const importer = factory.newResource(namespace, 'Importer', 'importer@acme.org');
    // create retailer
    const retailer = factory.newResource(namespace, 'Retailer', 'retailer@acme.org');
    retailer.products = [];
    const regulator = factory.newResource(namespace, 'Regulator', 'regulator@acme.org');
    regulator.location = "SF";
    regulator.exemptedOrgIds = ["XYZ Corp"];
    regulator.exemptedProductIds = [];
    const importerNS = namespace + '.Importer';
    const retailerNS = namespace + '.Retailer';
    const regulatorNS = namespace + '.Regulator';
    const supplierNS = namespace + '.Supplier';
    const importerRegistry = await businessNetworkConnection.getParticipantRegistry(importerNS);
    const retailerRegistry = await businessNetworkConnection.getParticipantRegistry(retailerNS);
    const regulatorRegistry = await businessNetworkConnection.getParticipantRegistry(regulatorNS);
    const supplierRegistry = await businessNetworkConnection.getParticipantRegistry(supplierNS);
    await supplierRegistry.add(supplier);
    await importerRegistry.add(importer);
    await retailerRegistry.add(retailer);
    await regulatorRegistry.add(regulator);
    let identity = await businessNetworkConnection.issueIdentity(supplierNS + '#supplier@acme.org', 'supplier');
    await importCardForIdentity(supplierCardName, identity);
    identity = await businessNetworkConnection.issueIdentity(importerNS + '#importer@acme.org', 'importer');
    await importCardForIdentity(importerCardName, identity);
    identity = await businessNetworkConnection.issueIdentity(retailerNS + '#retailer@acme.org', 'retailer');
    await importCardForIdentity(retailerCardName, identity);
    identity = await businessNetworkConnection.issueIdentity(regulatorNS + '#regulator@acme.org', 'regulator');
    await importCardForIdentity(retailerCardName, identity);
    await useIdentity(supplierCardName);
    const listing = factory.newTransaction(namespace, 'createProductListing');
    listing.listingtId = "l1"
    listing.products = ["producta,5"];
    listing.user = factory.newRelationship(namespace, 'Supplier', supplier.$identifier);
    // Get the asset registry.
    await businessNetworkConnection.submitTransaction(listing);
    const assetRegistry = await businessNetworkConnection.getAssetRegistry(namespace + '.ProductListingContract');
    const assets = await assetRegistry.getAll();
    assets[0].owner.$identifier.should.equal(supplier.$identifier);
  });
  /**
   * Reconnect using a different identity.
   * @param {String} cardName The name of the card for the identity to use
   */
  async function useIdentity(cardName) {
    await businessNetworkConnection.disconnect();
    businessNetworkConnection = new BusinessNetworkConnection();
    events = [];
    businessNetworkConnection.on('event', (event) => {
      events.push(event);
    });
    await businessNetworkConnection.connect(cardName);
    factory = businessNetworkConnection.getBusinessNetwork().getFactory();
  }
  it('Transfer ProductListing to Importer', async () => {
    await useIdentity(adminCardName);
    const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
    const assetRegistry = await businessNetworkConnection.getAssetRegistry(namespace + '.ProductListingContract');
    const assets = await assetRegistry.getAll();
    var importerId = 'importer@acme.org';
    var listingId = assets[0].getIdentifier();
    const listing = factory.newTransaction(namespace, 'transferListing');
    listing.ownerType = "supplier";
    listing.newOwner = factory.newRelationship(namespace, 'Importer', importerId);
    listing.productListing = factory.newRelationship(namespace, 'ProductListingContract', listingId);
    await businessNetworkConnection.submitTransaction(listing);
    var productRegistry = await assetRegistry.get(listingId);
    //productRegistry.should.have.lengthOf(0);
    productRegistry.owner.$identifier.should.equal(importerId);
  });
  it('Exempt Check for ProductListing', async () => {
    await useIdentity(adminCardName);
    const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
    const assetRegistry = await businessNetworkConnection.getAssetRegistry(namespace + '.ProductListingContract');
    const assets = await assetRegistry.getAll();
    var importerId = 'importer@acme.org';
    var listingId = assets[0].getIdentifier();
    var listing = factory.newTransaction(namespace, 'transferListing');
    listing.ownerType = "supplier";
    listing.newOwner = factory.newRelationship(namespace, 'Importer', importerId);
    listing.productListing = factory.newRelationship(namespace, 'ProductListingContract', listingId);
    await businessNetworkConnection.submitTransaction(listing);
    //await useIdentity(importerCardName);
    var productRegistry = await assetRegistry.get(listingId);
    productRegistry.owner.$identifier.should.equal(importerId);
    var regulatorId = 'regulator@acme.org';
    var importerId = 'importer@acme.org';
    listing = factory.newTransaction(namespace, 'checkProducts');
    listing.regulator = factory.newRelationship(namespace, 'Regulator', regulatorId);
    listing.productListing = factory.newRelationship(namespace, 'ProductListingContract', listingId);
    await businessNetworkConnection.submitTransaction(listing);
    productRegistry = await assetRegistry.get(listingId);
    productRegistry.status.should.equal('CHECKCOMPLETED');
  });
  it('Transfer ProductListing to Retailer', async () => {
    await useIdentity(adminCardName);
    const factory = businessNetworkConnection.getBusinessNetwork().getFactory();
    const assetRegistry = await businessNetworkConnection.getAssetRegistry(namespace + '.ProductListingContract');
    const assets = await assetRegistry.getAll();
    var importerId = 'importer@acme.org';
    var listingId = assets[0].getIdentifier();
    var listing = factory.newTransaction(namespace, 'transferListing');
    listing.ownerType = "supplier";
    listing.newOwner = factory.newRelationship(namespace, 'Importer', importerId);
    listing.productListing = factory.newRelationship(namespace, 'ProductListingContract', listingId);
    await businessNetworkConnection.submitTransaction(listing);
    var productRegistry = await assetRegistry.get(listingId);
    productRegistry.owner.$identifier.should.equal(importerId);
    //await useIdentity(importerCardName);
    var regulatorId = 'regulator@acme.org';
    var importerId = 'importer@acme.org';
    listing = factory.newTransaction(namespace, 'checkProducts');
    listing.regulator = factory.newRelationship(namespace, 'Regulator', regulatorId);
    listing.productListing = factory.newRelationship(namespace, 'ProductListingContract', listingId);
    await businessNetworkConnection.submitTransaction(listing);
    productRegistry = await assetRegistry.get(listingId);
    productRegistry.status.should.equal('CHECKCOMPLETED');
    var retailerId = 'retailer@acme.org';
    listing = factory.newTransaction(namespace, 'transferListing');
    listing.ownerType = "importer";
    listing.newOwner = factory.newRelationship(namespace, 'Retailer', retailerId);
    listing.productListing = factory.newRelationship(namespace, 'ProductListingContract', listingId);
    await businessNetworkConnection.submitTransaction(listing);
    productRegistry = await assetRegistry.get(listingId);
    productRegistry.owner.$identifier.should.equal(retailerId);
  });
});