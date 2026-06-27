// Funcionalidad de tema oscuro/claro
const themeToggle = document.getElementById("themeToggle");
if(themeToggle){
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    if(isDarkMode){
        document.body.classList.add("dark-mode");
        themeToggle.textContent = "☀️";
    }
    
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDark = document.body.classList.contains("dark-mode");
        localStorage.setItem("darkMode", isDark);
        themeToggle.textContent = isDark ? "☀️" : "🌙";
    });
}

// Variables globales
const ADMIN_PASSWORD = "admin123"; // Cambiar en producción
let expedientes = JSON.parse(localStorage.getItem("expedientes")) || [];

// Util: mostrar toast temporal
function showToast(message, type = 'success', timeout = 3000){
    const div = document.createElement('div');
    div.className = 'toast ' + (type === 'error' ? 'error' : (type === 'success' ? 'success' : ''));
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(()=>{ div.style.opacity = '1'; }, 10);
    setTimeout(()=>{ div.style.opacity = '0'; setTimeout(()=>div.remove(), 300); }, timeout);
}

// Actualizar estado admin en localStorage y UI
function setAdminLoggedIn(isLoggedIn){
    localStorage.setItem('adminLoggedIn', isLoggedIn);
    const adminPanelDiv = document.getElementById('adminPanel');
    if(adminPanelDiv){
        adminPanelDiv.style.display = isLoggedIn ? 'flex' : 'none';
    }
    cargarExpedientes();
}

// Cargar expedientes en la tabla
function cargarExpedientes(){
    const tablaExpedientes = document.getElementById('tablaExpedientes');
    if(!tablaExpedientes) return;

    tablaExpedientes.innerHTML = '';

    // Detectar columnas (por ejemplo, si hay columna Fecha o Acciones)
    const table = tablaExpedientes.closest('table');
    const headers = table ? Array.from(table.querySelectorAll('th')).map(h => h.textContent.trim()) : [];
    const tieneAcciones = headers.some(h => /Acciones/i.test(h));
    const tieneFecha = headers.some(h => /Fecha/i.test(h));
    const isAdmin = localStorage.getItem('adminLoggedIn') === 'true';

    expedientes.forEach((exp, index) =>{
        const fecha = exp.fecha || '';
        let row = '<tr>' +
            `<td>${escapeHtml(exp.numero || '')}</td>` +
            `<td>${escapeHtml(exp.cliente || '')}</td>` +
            `<td>${escapeHtml(exp.tipo || '')}</td>`;

        if(tieneFecha){ row += `<td>${escapeHtml(fecha)}</td>`; }

        if(tieneAcciones){
            row += '<td>';
            if(isAdmin){
                row += `<button class="btn-edit" onclick="editarExpediente(${index})">Editar</button>`;
                row += `<button class="btn-delete" onclick="eliminarExpediente(${index})">Eliminar</button>`;
            } else {
                row += `<span style="color:var(--muted);">-</span>`;
            }
            row += '</td>';
        }

        row += '</tr>';
        tablaExpedientes.insertAdjacentHTML('beforeend', row);
    });
}

// Escape simple para evitar inyecciones accidentales en la tabla
function escapeHtml(str){
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Manejo del formulario de registro con validación básica
const formulario = document.getElementById('formulario');
if(formulario){
    formulario.addEventListener('submit', function(e){
        e.preventDefault();
        const numero = document.getElementById('numero').value.trim();
        const cliente = document.getElementById('cliente').value.trim();
        const tipo = document.getElementById('tipo').value;
        const fecha = document.getElementById('fecha') ? document.getElementById('fecha').value : '';
        const descripcion = document.getElementById('descripcion') ? document.getElementById('descripcion').value.trim() : '';

        if(!numero){ showToast('El número de expediente es obligatorio.', 'error'); return; }
        if(!cliente || cliente.length < 3){ showToast('Nombre de cliente inválido.', 'error'); return; }
        if(!tipo){ showToast('Selecciona el tipo de operación.', 'error'); return; }
        // Previene duplicados por número
        if(expedientes.some(e => e.numero === numero)){
            showToast('Ya existe un expediente con ese número.', 'error');
            return;
        }

        const nuevo = { numero, cliente, tipo, fecha, descripcion };
        expedientes.push(nuevo);
        localStorage.setItem('expedientes', JSON.stringify(expedientes));
        cargarExpedientes();
        formulario.reset();
        showToast('Expediente guardado correctamente.', 'success');
    });
}

// Funciones admin: modal y control discreto
function openAdminModal(){
    const modal = document.getElementById('adminModal');
    if(!modal) return;
    modal.setAttribute('aria-hidden','false');
    const pw = document.getElementById('modalAdminPassword');
    if(pw) pw.value = '';
    setTimeout(()=>{ if(pw) pw.focus(); }, 120);
}
function closeAdminModal(){
    const modal = document.getElementById('adminModal');
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
}

function attemptAdminLogin(){
    const pw = document.getElementById('modalAdminPassword');
    if(!pw) return;
    if(pw.value === ADMIN_PASSWORD){
        setAdminLoggedIn(true);
        closeAdminModal();
        showToast('Acceso de administrador activado.', 'success');
    } else {
        showToast('Contraseña incorrecta.', 'error');
    }
}

function logoutAdmin(){
    setAdminLoggedIn(false);
    showToast('Sesión de administrador cerrada.', 'success');
}

function eliminarExpediente(index){
    if(confirm('¿Estás seguro de que deseas eliminar este expediente?')){
        expedientes.splice(index,1);
        localStorage.setItem('expedientes', JSON.stringify(expedientes));
        cargarExpedientes();
        showToast('Expediente eliminado.', 'success');
    }
}

// Edición mediante modal (más amigable que prompt)
function editarExpediente(index){
    const exp = expedientes[index];
    // Crear modal de edición dinámicamente
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('aria-hidden','false');
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Editar expediente</h3>
            <label>Número</label>
            <input id="_edit_numero" value="${escapeHtml(exp.numero)}" />
            <label>Cliente</label>
            <input id="_edit_cliente" value="${escapeHtml(exp.cliente)}" />
            <label>Tipo</label>
            <select id="_edit_tipo">
                <option value="importacion">Importación</option>
                <option value="exportacion">Exportación</option>
            </select>
            <div class="modal-actions">
                <button id="_edit_save">Guardar</button>
                <button id="_edit_cancel" class="secondary">Cancelar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    // Ajustar select al valor actual
    const sel = modal.querySelector('#_edit_tipo');
    if(sel) sel.value = exp.tipo || '';

    modal.querySelector('#_edit_cancel').addEventListener('click', ()=>{ modal.remove(); });
    modal.addEventListener('click', (ev)=>{ if(ev.target === modal) modal.remove(); });
    modal.querySelector('#_edit_save').addEventListener('click', ()=>{
        const numero = modal.querySelector('#_edit_numero').value.trim();
        const cliente = modal.querySelector('#_edit_cliente').value.trim();
        const tipo = modal.querySelector('#_edit_tipo').value;
        if(!numero || !cliente || !tipo){ showToast('Completa todos los campos.', 'error'); return; }
        // evitar duplicados en otro índice
        if(expedientes.some((e,i)=> e.numero === numero && i !== index)){
            showToast('Ya existe otro expediente con ese número.', 'error'); return;
        }
        expedientes[index] = { ...expedientes[index], numero, cliente, tipo };
        localStorage.setItem('expedientes', JSON.stringify(expedientes));
        cargarExpedientes();
        modal.remove();
        showToast('Expediente actualizado.', 'success');
    });
}

// Gestión de documentación (almacenada en localStorage bajo la clave 'docs')
function readFileAsDataURL(file){
    return new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onload = ()=> resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function loadDocs(){
    try{
        return JSON.parse(localStorage.getItem('docs') || '[]');
    }catch(e){ return []; }
}
function saveDocs(list){ localStorage.setItem('docs', JSON.stringify(list)); }

function formatDateIso(iso){
    if(!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
}

function cargarDocumentos(){
    const container = document.getElementById('docList');
    if(!container) return;
    const docs = loadDocs();
    const search = (document.getElementById('docSearch') ? document.getElementById('docSearch').value.trim().toLowerCase() : '');
    const sort = (document.getElementById('docSort') ? document.getElementById('docSort').value : 'new');

    let filtered = docs.filter(d => {
        if(!search) return true;
        const inTitle = (d.title || '').toLowerCase().includes(search);
        const inTags = (d.tags || []).join(',').toLowerCase().includes(search);
        const inDesc = (d.desc || '').toLowerCase().includes(search);
        return inTitle || inTags || inDesc;
    });

    if(sort === 'name'){
        filtered.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
    } else { // new
        filtered.sort((a,b)=> new Date(b.uploadedAt) - new Date(a.uploadedAt));
    }

    container.innerHTML = '';
    if(filtered.length === 0){ container.innerHTML = '<div style="color:var(--muted)">No hay documentos.</div>'; return; }

    filtered.forEach((d, idx)=>{
        const item = document.createElement('div');
        item.className = 'doc-item';
        const meta = document.createElement('div'); meta.className = 'doc-meta';
        const title = document.createElement('div'); title.className = 'title'; title.textContent = d.title || d.filename || 'Documento';
        const metaLine = document.createElement('div'); metaLine.className = 'meta';
        metaLine.textContent = `${d.filename || ''} · ${formatDateIso(d.uploadedAt)}${d.tags && d.tags.length? ' · '+d.tags.join(', '): ''}`;
        const desc = document.createElement('div'); desc.className='meta'; desc.textContent = d.desc || '';
        meta.appendChild(title); meta.appendChild(metaLine); if(d.desc) meta.appendChild(desc);

        const actions = document.createElement('div'); actions.className = 'doc-actions';
        const aDownload = document.createElement('a');
        aDownload.textContent = 'Descargar';
        aDownload.href = d.dataUrl;
        aDownload.download = d.filename || 'documento.pdf';
        aDownload.className = 'secondary';
        aDownload.style.padding = '8px 12px';
        aDownload.style.borderRadius = '8px';
        aDownload.style.textDecoration = 'none';
        aDownload.style.background = '#eef2ff';
        aDownload.style.color = 'var(--accent)';

        const btnDelete = document.createElement('button');
        btnDelete.textContent = 'Eliminar';
        btnDelete.className = 'btn-delete';
        btnDelete.addEventListener('click', ()=>{ deleteDocById(d.id); });

        actions.appendChild(aDownload);
        actions.appendChild(btnDelete);

        item.appendChild(meta);
        item.appendChild(actions);
        container.appendChild(item);
    });
}

function deleteDocById(id){
    if(!confirm('¿Eliminar documento? Esta acción no se puede deshacer.')) return;
    let docs = loadDocs();
    docs = docs.filter(d=> d.id !== id);
    saveDocs(docs);
    cargarDocumentos();
    showToast('Documento eliminado.', 'success');
}

// Inicialización al cargar la página
window.addEventListener('load', ()=>{
    // Enlazar toggle admin si existe
    const adminToggle = document.getElementById('adminToggle');
    if(adminToggle){ adminToggle.addEventListener('click', openAdminModal); }

    // Enlazar modal botones
    const modalLoginBtn = document.getElementById('modalAdminLogin');
    const modalCancelBtn = document.getElementById('modalAdminCancel');
    const adminModal = document.getElementById('adminModal');
    if(modalLoginBtn) modalLoginBtn.addEventListener('click', attemptAdminLogin);
    if(modalCancelBtn) modalCancelBtn.addEventListener('click', ()=>{ closeAdminModal(); });
    if(adminModal){ adminModal.addEventListener('click', (ev)=>{ if(ev.target === adminModal) closeAdminModal(); }); }

    // Mostrar estado admin si ya estaba
    const isLogged = localStorage.getItem('adminLoggedIn') === 'true';
    setAdminLoggedIn(isLogged);

    // Cargar expedientes al inicio
    cargarExpedientes();

    // --- Documentación: enlace y bindings (si existen elementos) ---
    const showDocsBtn = document.getElementById('showDocsBtn');
    const adminDocs = document.getElementById('adminDocs');
    if(showDocsBtn && adminDocs){
        showDocsBtn.addEventListener('click', ()=>{
            const visible = adminDocs.style.display !== 'none';
            adminDocs.style.display = visible ? 'none' : 'block';
            showDocsBtn.textContent = visible ? 'Documentación' : 'Cerrar documentación';
            if(!visible){ cargarDocumentos(); }
        });
    }

    const docForm = document.getElementById('docForm');
    if(docForm){
        docForm.addEventListener('submit', async (e)=>{
            e.preventDefault();
            const title = document.getElementById('docTitle').value.trim();
            const desc = document.getElementById('docDesc').value.trim();
            const tagsRaw = document.getElementById('docTags').value.trim();
            const fileInput = document.getElementById('docFile');
            if(!title){ showToast('Título es obligatorio.', 'error'); return; }
            if(!fileInput || !fileInput.files || fileInput.files.length === 0){ showToast('Selecciona un PDF.', 'error'); return; }
            const file = fileInput.files[0];
            if(file.type !== 'application/pdf'){ showToast('Solo se admiten archivos PDF.', 'error'); return; }
            try{
                const dataUrl = await readFileAsDataURL(file);
                const docs = loadDocs();
                const doc = {
                    id: 'doc-'+Date.now(),
                    title, desc, tags: tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : [],
                    filename: file.name,
                    mime: file.type,
                    dataUrl,
                    uploadedAt: new Date().toISOString()
                };
                docs.push(doc);
                saveDocs(docs);
                docForm.reset();
                cargarDocumentos();
                showToast('Documento subido correctamente.', 'success');
            }catch(err){
                console.error(err);
                showToast('Error leyendo el archivo.', 'error');
            }
        });
        const docClear = document.getElementById('docClear');
        if(docClear){ docClear.addEventListener('click', ()=>{ docForm.reset(); }); }
    }

    const docSearch = document.getElementById('docSearch');
    if(docSearch){ docSearch.addEventListener('input', ()=>{ cargarDocumentos(); }); }
    const docSort = document.getElementById('docSort');
    if(docSort){ docSort.addEventListener('change', ()=>{ cargarDocumentos(); }); }

    // Si la sección docs está presente y visible por defecto, cargar la lista
    const docListEl = document.getElementById('docList');
    if(docListEl && adminDocs && adminDocs.style.display !== 'none') cargarDocumentos();
});