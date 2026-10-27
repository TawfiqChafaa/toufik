import test from "node:test";
import assert from "node:assert/strict";
import {validateIdea,validReviewDate,encodeIdeasBackup,decodeIdeasBackup,filterIdeas} from "../src/ideas-domain.js";
const idea={id:"idee-1",text:"Créer un atelier éco-responsable",category:"Travail",status:"À explorer",reviewAt:"2026-11-12T10:30",createdAt:"2026-10-27T10:00:00.000Z",updatedAt:"2026-10-27T10:00:00.000Z",version:1};
test("export et import préservent tous les champs des idées",()=>assert.deepEqual(decodeIdeasBackup(JSON.parse(JSON.stringify(encodeIdeasBackup([idea])))),[idea]));
test("une sauvegarde incompatible ou avec doublons est refusée",()=>{
 for(const data of [[],{format:"tasks",schemaVersion:1,ideas:[idea]}, {...encodeIdeasBackup([idea]),schemaVersion:2},encodeIdeasBackup([idea,idea])])assert.throws(()=>decodeIdeasBackup(data));
});
test("une idée invalide ne devient pas une donnée persistante",()=>{
 for(const value of [{text:" "},{status:"Inconnue"},{category:"<script>"},{version:0},{reviewAt:"2026-02-30T12:00"},{reviewAt:"2026-11-12T25:00"},{updatedAt:"2020-01-01T00:00:00Z"}])assert.throws(()=>validateIdea({...idea,...value}));
});
test("les années bissextiles et dates locales sont validées",()=>{
 assert.equal(validReviewDate("2028-02-29T12:00"),true);assert.equal(validReviewDate("2027-02-29T12:00"),false);assert.equal(validReviewDate("2026-13-01T10:00"),false);
});
test("la recherche ignore accents et casse, filtre le statut sans muter les données",()=>{
 const other={...idea,id:"2",text:"Planifier les vacances",status:"Archivée",updatedAt:"2026-10-28T12:00:00Z"};
 const source=[idea,other];
 assert.deepEqual(filterIdeas(source,"ECO"),[idea]);assert.deepEqual(filterIdeas(source,"","Archivée"),[other]);assert.deepEqual(filterIdeas(source).map(i=>i.id),["2","idee-1"]);assert.equal(source[0],idea);
});
