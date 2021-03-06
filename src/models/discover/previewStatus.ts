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


export interface PreviewStatus { 
    /**
     * The orgId which is the subscription id in CIC.
     */
    Organisation?: string;
    /**
     * The spark job name
     */
    JobName?: string;
    /**
     * The dataset id.
     */
    DatasetID?: string;
    /**
     * The Message describing the process mining status.
     */
    Message?: string;
    /**
     * The log level
     */
    Level?: string;
    /**
     * The progress of preview. It\'s a number from 0 to 100. 0 means error. 100 means the preview process is completed.
     */
    Progression?: number;
    /**
     * The timestamp of the status.
     */
    TimeStamp?: number;
}

