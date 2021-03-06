/**
 * TIBCO Discover public API
 * TIBCO Discover public API
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { InvestigationApplication } from './investigationApplication';
import { FieldFormats } from './fieldFormats';
import { Message } from './message';
import { GeneralInformation } from './generalInformation';
import { LandingPage } from './landingPage';
import { Automapping } from './automapping';
import { Analytics } from './analytics';


export interface ApplicationConfiguration { 
    general?: GeneralInformation;
    landingPage?: LandingPage;
    messages?: Array<Message>;
    formats?: Array<FieldFormats>;
    automap?: Array<Automapping>;
    investigations?: Array<InvestigationApplication>;
    analytics?: Analytics;
}

