import {
    CalmInterface, CalmInterfaceDefinition
} from './interface.js';
import {
} from '../types/interface-types.js';


describe('CalmInterfaceDefinition', () => {
    it('should create a CalmInterfaceDefinition when "interface-definition-url" and "configuration" are present', () => {
        const defData = {
            'unique-id': 'def-123',
            'interface-definition-url': 'https://example.com/def.json',
            configuration: { alpha: true, threshold: 5 }
        };
        const iface = CalmInterface.fromJson(defData);
        expect(iface).toBeInstanceOf(CalmInterfaceDefinition);
        const def = iface as CalmInterfaceDefinition;
        expect(def.uniqueId).toBe('def-123');
        expect(def.interfaceDefinitionUrl).toBe('https://example.com/def.json');
        expect(def.configuration).toEqual({ alpha: true, threshold: 5 });
    });

    it('should throw if "interface-definition-url" is present but configuration is missing', () => {
        const badDef = {
            'unique-id': 'bad-001',
            'interface-definition-url': 'https://example.com/def.json'
        };
        expect(() => CalmInterface.fromJson(badDef))
            .toThrow(/Unknown interface type|configuration/);
    });

});
